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
function verifyJWT(req, res, next) {
  console.log("abc");
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized " });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: " Forbidden" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    await client.connect();
    const partsCollection = client.db("manufacturer_data").collection("parts");
    const purchaseCollection = client
      .db("manufacturer_data")
      .collection("purchase");
    const userCollection = client.db("manufacturer_data").collection("users");

    console.log("all route should work perfectly in heroku");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    };

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;

      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send({ result });
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    app.get("/parts", async (req, res) => {
      const parts = await partsCollection.find().toArray();
      res.send(parts);
    });
    app.post("/parts", verifyJWT, verifyAdmin, async (req, res) => {
      const part = req.body;
      const result = await partsCollection.insertOne(part);
      res.send(result);
    });
    app.get("/part/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.find(query).toArray();
      res.send(part);
    });
    app.delete("/parts/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await partsCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    app.delete("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };

      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/purchase", verifyJWT, async (req, res) => {
      const user = req.query.user;
      const decodedEmail = req.decoded.email;
      if (user == decodedEmail) {
        const query = { user: user };
        const purchase = await purchaseCollection.find(query).toArray();
        res.send(purchase);
      } else {
        return res.status(403).send({ message: "Forbidden " });
      }
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
  res.send("Manufacturer website");
});

app.listen(port, () => {
  console.log(`manufacturer-website ${port}`);
});
