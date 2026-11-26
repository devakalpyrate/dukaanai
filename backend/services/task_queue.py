import json
import logging
import queue
import re
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_shop_queues: Dict[int, queue.Queue] = {}
_shop_workers: Dict[int, threading.Thread] = {}
_tasks_store: Dict[str, Dict[str, Any]] = {}
_manager_lock = threading.Lock()


class ShopFIFOQueueManager:

    @classmethod
    def get_or_create_shop_queue(cls, shop_id: int) -> queue.Queue:
        with _manager_lock:
            if shop_id not in _shop_queues:
                _shop_queues[shop_id] = queue.Queue()
                worker = threading.Thread(
                    target=cls._shop_worker_loop,
                    args=(shop_id,),
                    name=f"ShopFIFOQueueWorker-{shop_id}",
                    daemon=True,
                )
                worker.start()
                _shop_workers[shop_id] = worker
                logger.info("Initialized isolated FIFO worker queue for shop_id: %s", shop_id)
            return _shop_queues[shop_id]

    @classmethod
    def enqueue_task(
        cls,
        shop_id: int,
        user_id: int,
        raw_text: str,
        action: str = "auto",
        parameters: Optional[Dict[str, Any]] = None,
    ) -> str:
        q = cls.get_or_create_shop_queue(shop_id)
        task_id = f"task_{shop_id}_{int(time.time())}_{uuid.uuid4().hex[:4]}"

        task_data = {
            "task_id": task_id,
            "shop_id": shop_id,
            "user_id": user_id,
            "raw_text": (raw_text or "").strip(),
            "action": action,
            "parameters": parameters or {},
            "status": "queued",
            "enqueued_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "result": None,
            "error": None,
        }
        _tasks_store[task_id] = task_data
        q.put(task_data)
        logger.info("Enqueued FIFO task %s for shop %s: %s", task_id, shop_id, raw_text)
        return task_id

    @classmethod
    def enqueue(cls, shop_id: int, user_id: int, text: str, **kwargs) -> str:
        return cls.enqueue_task(shop_id=shop_id, user_id=user_id, raw_text=text, **kwargs)

    @classmethod
    def _shop_worker_loop(cls, shop_id: int) -> None:
        q = _shop_queues[shop_id]
        while True:
            try:
                task = q.get()
                if task is None:
                    break
                cls._execute_shop_task(task)
                q.task_done()
            except Exception as loop_err:
                logger.error("Error in shop worker loop for shop %s: %s", shop_id, loop_err, exc_info=True)
            finally:
                time.sleep(0.05)

    @classmethod
    def _execute_shop_task(cls, task: Dict[str, Any]) -> None:
        task_id = task["task_id"]
        shop_id = task["shop_id"]
        user_id = task["user_id"]
        raw_text = task["raw_text"]

        task["status"] = "processing"
        logger.info("FIFO Worker executing task %s for shop %s", task_id, shop_id)

        try:
            from backend.models.ai import GroqLLMClient
            from backend.services.business_logic import CustomerService, TransactionService
            from backend.queries import notification as notification_queries
            from backend.queries import shops as shop_queries

            sh = shop_queries.get_shop_by_id(shop_id)
            actual_user_id = (sh.get("owner_id") if sh else None) or user_id

            llm = GroqLLMClient()

            contract = llm._rule_based_fallback(raw_text, shop_id=shop_id)

            if not contract or contract.action in ("request_recorded_pending", "none", "unknown"):
                try:
                    if llm.is_configured():
                        contract = llm.understand_intent(
                            text=raw_text,
                            context=None,
                            shop_id=None,
                        )
                except Exception as llm_err:
                    logger.warning("LLM parsing unavailable during FIFO processing: %s", llm_err)

            if contract and contract.action in ("record_credit", "record_payment", "record_debit"):
                p = contract.parameters
                cust_name = p.get("customer_name") or "Customer"
                amt = float(p.get("amount") or 0.0)
                t_type = "credit" if contract.action == "record_credit" else "payment"

                if amt > 0:
                    resolved_cust, was_created = CustomerService.resolve_or_create_customer(
                        shop_id=shop_id,
                        name_or_phone=cust_name,
                        auto_create=True,
                    )
                    tx = TransactionService.record_transaction(
                        shop_id=shop_id,
                        customer_id=resolved_cust["id"],
                        transaction_type=t_type,
                        amount=amt,
                        description="Voice FIFO ledger update",
                    )

                    amt_disp = int(amt) if amt.is_integer() else f"{amt:,.2f}"
                    if t_type == "credit":
                        n_title = f"नया उधार / Credit: {resolved_cust['name']}"
                        n_msg = f"₹{amt_disp} का उधार खाते में दर्ज कर दिया गया है।"
                    else:
                        n_title = f"भुगतान प्राप्त / Payment: {resolved_cust['name']}"
                        n_msg = f"₹{amt_disp} का भुगतान खाते में जमा कर दिया गया है।"

                    try:
                        notification_queries.create_notification(
                            shop_id=shop_id,
                            user_id=actual_user_id,
                            title=n_title,
                            message=n_msg,
                            notification_type=t_type,
                        )
                    except Exception as notif_err:
                        logger.warning("Notification creation failed: %s", notif_err)

                    task["status"] = "completed"
                    task["result"] = tx
                    task["completed_at"] = datetime.now(timezone.utc).isoformat()
                    logger.info("Shop %s FIFO task %s completed successfully: tx_id=%s", shop_id, task_id, tx.get("id"))
                    return

            try:
                notification_queries.create_notification(
                    shop_id=shop_id,
                    user_id=actual_user_id,
                    title="🎙️ Voice Note / आवाज नोट",
                    message=f"आवाज निर्देश नोट किया गया: \"{raw_text}\"",
                    notification_type="info",
                )
            except Exception:
                pass

            task["status"] = "completed"
            task["result"] = {"message": f"Recorded: {raw_text}"}
            task["completed_at"] = datetime.now(timezone.utc).isoformat()

        except Exception as exc:
            logger.error("Shop %s FIFO task %s failed: %s", shop_id, task_id, exc, exc_info=True)
            task["status"] = "failed"
            task["error"] = str(exc)
            task["completed_at"] = datetime.now(timezone.utc).isoformat()


DukaanTaskQueue = ShopFIFOQueueManager
