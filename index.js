const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.20lve.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const partsCollection = client.db("manufacturer_data").collection("parts");
    const purchaseCollection = client
      .db("manufacturer_data")
      .collection("purchase");

    app.get("/parts", async (req, res) => {
      const parts = await partsCollection.find().toArray();
      res.send(parts);
    });

    app.get("/part/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.find(query).toArray();
      res.send(part);
    });
    app.post("/purchase", async (req, res) => {
      const purchase = req.body;
      const query = {
        productName: purchase.productName,
        user: purchase.user,
      };
      const exist = await purchaseCollection.findOne(query);
      if (exist) {
        return res.send({ success: false, purchase: exist });
      }
      const result = await purchaseCollection.insertOne(purchase);
      return res.send({ success: true, result });
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Manufacturer website data");
});

app.listen(port, () => {
  console.log(`manufacturer website ${port}`);
});
