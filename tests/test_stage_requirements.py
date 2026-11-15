import unittest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.database.supabase_client import get_supabase
from app.services.business_logic import CustomerService, ProductService, InventoryService, TransactionService
from app.services.intent_executor import IntentExecutor
from app.queries import customer as customer_queries
from app.queries import product as product_queries
from app.queries import inventory_logs as log_queries

class TestDukaanAIIntelligentResolutionAndAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_email_1 = f"test.owner.1_{uuid.uuid4().hex[:6]}@dukaan.ai"
        cls.test_email_2 = f"test.owner.2_{uuid.uuid4().hex[:6]}@dukaan.ai"

        res1 = cls.client.post("/api/auth/register", json={
            "name": "Owner One",
            "email": cls.test_email_1,
            "password": "Password123!",
            "shop_name": "Test Kirana 1"
        })
        assert res1.status_code == 201, res1.text
        cls.owner1_data = res1.json()
        cls.token1 = cls.owner1_data["access_token"]
        cls.shop1_id = cls.owner1_data["shop_id"]

        res2 = cls.client.post("/api/auth/register", json={
            "name": "Owner Two",
            "email": cls.test_email_2,
            "password": "Password123!",
            "shop_name": "Test Kirana 2"
        })
        assert res2.status_code == 201, res2.text
        cls.owner2_data = res2.json()
        cls.token2 = cls.owner2_data["access_token"]
        cls.shop2_id = cls.owner2_data["shop_id"]

    @classmethod
    def tearDownClass(cls):
        sb = get_supabase()
        try:
            for sid in [cls.shop1_id, cls.shop2_id]:
                sb.table("inventory_logs").delete().eq("shop_id", sid).execute()
                sb.table("inventory").delete().eq("shop_id", sid).execute()
                sb.table("transactions").delete().eq("shop_id", sid).execute()
                sb.table("products").delete().eq("shop_id", sid).execute()
                sb.table("customers").delete().eq("shop_id", sid).execute()
                sb.table("shops").delete().eq("id", sid).execute()
            for uid in [cls.owner1_data["user_id"], cls.owner2_data["user_id"]]:
                sb.table("users").delete().eq("id", uid).execute()
        except Exception:
            pass

    def test_01_unauthenticated_requests_blocked(self):
        res1 = self.client.post("/api/voice/transcribe")
        self.assertEqual(res1.status_code, 401)
        res2 = self.client.post("/api/ai/understand-intent", json={"text": "hello"})
        self.assertEqual(res2.status_code, 401)
        res3 = self.client.post("/api/action/execute", json={"intent_data": {}})
        self.assertEqual(res3.status_code, 401)
        res4 = self.client.get("/api/customers")
        self.assertEqual(res4.status_code, 401)

    def test_02_shop_isolation(self):
        headers1 = {"Authorization": f"Bearer {self.token1}"}
        res_c1 = self.client.post("/api/customers", json={"name": "Shop1 Private Customer"}, headers=headers1)
        self.assertEqual(res_c1.status_code, 200)

        headers2 = {"Authorization": f"Bearer {self.token2}"}
        res_c2 = self.client.get("/api/customers", headers=headers2)
        self.assertEqual(res_c2.status_code, 200)
        c2_names = [c["name"] for c in res_c2.json()["data"]]
        self.assertNotIn("Shop1 Private Customer", c2_names)

    def test_03_new_customer_creation(self):
        headers = {"Authorization": f"Bearer {self.token1}"}
        res = self.client.post("/api/customers", json={"name": "Suresh Raina", "phone": "9876500001"}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data"]["name"], "Suresh Raina")

    def test_04_existing_customer_reused(self):
        cust, created = CustomerService.resolve_or_create_customer(self.shop1_id, "Suresh Raina")
        self.assertFalse(created)
        self.assertEqual(cust["name"], "Suresh Raina")

    def test_05_ambiguous_customer_triggers_clarification(self):
        CustomerService.add_customer(self.shop1_id, "Rahul Sharma", "9000000001")
        CustomerService.add_customer(self.shop1_id, "Rahul Verma", "9000000002")
        intent_payload = {
            "shop_id": self.shop1_id,
            "intent": "credit_transaction",
            "action": "record_credit",
            "parameters": {"customer_name": "Rahul", "amount": "500.00"},
            "entities": {"customer": "Rahul"},
            "original_text": "Rahul ko 500 rupaye udhar diya",
            "requires_confirmation": False,
            "clarification_needed": False,
        }
        res = IntentExecutor.execute(intent_payload, confirmed=False)
        self.assertTrue(res.clarification_needed)
        self.assertIn("Multiple customers found", res.clarification_question)

    def test_06_transaction_creates_missing_customer(self):
        intent_payload = {
            "shop_id": self.shop1_id,
            "intent": "credit_transaction",
            "action": "record_credit",
            "parameters": {"customer_name": "New Auto Customer", "amount": "250.00"},
            "entities": {"customer": "New Auto Customer"},
            "original_text": "New Auto Customer ko 250 rupaye udhar diya",
            "requires_confirmation": False,
            "clarification_needed": False,
        }
        res = IntentExecutor.execute(intent_payload, confirmed=False, request_id="req-auto-c-1")
        self.assertTrue(res.success)
        self.assertIn("New customer 'New Auto Customer' created", res.message)
        self.assertEqual(res.result["amount"], "250.00")

    def test_07_failed_transaction_rollback_customer(self):
        intent_payload = {
            "shop_id": self.shop1_id,
            "intent": "credit_transaction",
            "action": "record_credit",
            "parameters": {"customer_name": "Phantom Customer", "amount": None},
            "entities": {"customer": "Phantom Customer"},
            "original_text": "Phantom Customer ko udhar diya",
            "requires_confirmation": False,
            "clarification_needed": False,
        }
        res = IntentExecutor.execute(intent_payload, confirmed=False)
        self.assertTrue(res.clarification_needed)
        matches = customer_queries.search_customers(self.shop1_id, "Phantom Customer")
        self.assertEqual(len(matches), 0)

    def test_08_missing_product_created(self):
        prod, was_created = ProductService.resolve_or_create_product(self.shop1_id, "Parle-G 50g", price=Decimal("10.00"), unit="packet")
        self.assertTrue(was_created)
        self.assertEqual(prod["name"], "Parle-G 50g")
        self.assertEqual(Decimal(str(prod["price"])), Decimal("10.00"))

    def test_09_inventory_initialization_and_adjustments(self):
        intent_payload = {
            "shop_id": self.shop1_id,
            "intent": "inventory_update",
            "action": "add_stock",
            "parameters": {"product_name": "Maggi Noodles 70g", "quantity": "25.00", "price": "14.00", "unit": "packet"},
            "entities": {"product": "Maggi Noodles 70g"},
            "original_text": "Inventory mein 25 packet Maggi Noodles 70g add karo",
            "requires_confirmation": False,
            "clarification_needed": False,
        }
        res = IntentExecutor.execute(intent_payload, confirmed=False)
        self.assertTrue(res.success)
        self.assertIn("New product 'Maggi Noodles 70g' initialized", res.message)
        self.assertEqual(Decimal(res.result["new_quantity"]), Decimal("25.00"))

    def test_10_inventory_logs_recorded(self):
        prod = product_queries.search_products(self.shop1_id, "Maggi Noodles 70g")[0]
        logs = log_queries.get_inventory_logs_by_product(self.shop1_id, prod["id"])
        self.assertGreaterEqual(len(logs), 1)
        self.assertEqual(Decimal(str(logs[0]["quantity_change"])), Decimal("25.00"))

    def test_11_repeated_request_idempotency(self):
        cust = customer_queries.search_customers(self.shop1_id, "New Auto Customer")[0]
        tx1 = TransactionService.record_transaction(
            shop_id=self.shop1_id,
            customer_id=cust["id"],
            transaction_type="credit",
            amount=Decimal("120.00"),
            request_id="test-idemp-key-999"
        )
        self.assertFalse(tx1["is_duplicate_replay"])

        tx2 = TransactionService.record_transaction(
            shop_id=self.shop1_id,
            customer_id=cust["id"],
            transaction_type="credit",
            amount=Decimal("120.00"),
            request_id="test-idemp-key-999"
        )
        self.assertTrue(tx2["is_duplicate_replay"])
        self.assertEqual(tx1["id"], tx2["id"])

    def test_12_different_request_ids_separate_transactions(self):
        cust = customer_queries.search_customers(self.shop1_id, "New Auto Customer")[0]
        tx_a = TransactionService.record_transaction(
            shop_id=self.shop1_id,
            customer_id=cust["id"],
            transaction_type="credit",
            amount=Decimal("120.00"),
            request_id="test-legit-key-A"
        )
        tx_b = TransactionService.record_transaction(
            shop_id=self.shop1_id,
            customer_id=cust["id"],
            transaction_type="credit",
            amount=Decimal("120.00"),
            request_id="test-legit-key-B"
        )
        self.assertNotEqual(tx_a["id"], tx_b["id"])
        self.assertFalse(tx_a["is_duplicate_replay"])
        self.assertFalse(tx_b["is_duplicate_replay"])

    def test_13_phase2_autonomous_market_price_discovery(self):
        intent_payload = {
            "intent": "inventory_update",
            "action": "add_stock",
            "shop_id": self.shop1_id,
            "parameters": {
                "product_name": "Aata",
                "quantity": "5",
                "unit": "kg",
            },
            "original_text": "Aata 5 kilo add kar do",
            "requires_confirmation": False,
            "clarification_needed": False,
        }
        res = IntentExecutor.execute(intent_payload, confirmed=False)
        self.assertTrue(res.success)
        self.assertFalse(res.clarification_needed)
        self.assertIn("Aata", res.message)
        prods = product_queries.search_products(self.shop1_id, "Aata")
        self.assertTrue(len(prods) > 0)
        self.assertEqual(Decimal(str(prods[0]["price"])), Decimal("42.00"))

    def test_14_phase3_supplier_milk_order_intent(self):
        intent_payload = {
            "intent": "supplier_order",
            "action": "order_from_supplier",
            "shop_id": self.shop1_id,
            "parameters": {
                "item": "doodh",
                "quantity": "20",
                "unit": "packet",
                "timing": "kal subah",
            },
            "original_text": "Kal subah ke liye 20 packet doodh order kar do",
            "requires_confirmation": False,
            "clarification_needed": False,
        }
        res = IntentExecutor.execute(intent_payload, confirmed=False)
        self.assertTrue(res.success)
        self.assertIn("whatsapp_url", res.result)
        self.assertIn("api.whatsapp.com/send", res.result["whatsapp_url"])
        self.assertIn("20 packet", res.spoken_message.lower())

    def test_15_customer_invoice_pdf_generation(self):
        cust = customer_queries.search_customers(self.shop1_id, "New Auto Customer")[0]
        res = self.client.get(f"/api/customers/{cust['id']}/invoice.pdf?shop_id={self.shop1_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "application/pdf")
        self.assertTrue(res.content.startswith(b"%PDF"))

if __name__ == "__main__":
    unittest.main()