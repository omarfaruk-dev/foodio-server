const express = require('express')
const cors = require('cors');
require('dotenv').config()

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2vxppji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // all collections here
    const foodsCollection = client.db('foodioDB').collection('foods');
    const ordersCollection = client.db('foodioDB').collection('orders');



    // all routes here

    //orders related api here

    // Get all orders added by a specific user (via email)
    app.get('/my-orders', async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: 'Email query is required' });
      }

      // Use aggregation to join food info
      const result = await ordersCollection.aggregate([
        { $match: { buyer_email: email } },
        {
          $addFields: {
            foodIdObj: {
              $cond: [
                { $eq: [ { $type: "$foodId" }, "objectId" ] },
                "$foodId",
                { $toObjectId: "$foodId" }
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'foods',
            localField: 'foodIdObj',
            foreignField: '_id',
            as: 'food_info'
          }
        },
        {
          $unwind: {
            path: '$food_info',
            preserveNullAndEmptyArrays: true
          }
        }
      ]).toArray();
      res.send(result);
    });

    // Post a new order and update food quantity & purchase_count with validation
    app.post('/orders', async (req, res) => {
      try {
        const newOrder = req.body;
        const foodId = newOrder.foodId;
        const orderQuantity = Number(newOrder.order_quantity);

        // Validate foodId
        if (!ObjectId.isValid(foodId)) {
          return res.status(400).send({ message: 'Invalid foodId' });
        }
        // Validate order quantity
        if (!orderQuantity || orderQuantity < 1) {
          return res.status(400).send({ message: 'Invalid order quantity' });
        }

        // Check if food exists
        const food = await foodsCollection.findOne({ _id: new ObjectId(foodId) });
        if (!food) {
          return res.status(404).send({ message: 'Food not found' });
        }
        // Check if enough quantity is available
        if (food.quantity < orderQuantity) {
          return res.status(400).send({ message: 'Items Stock Out' });
        }

        // Insert the new order
        const result = await ordersCollection.insertOne(newOrder);

        // Update the food item's quantity and purchase_count
        await foodsCollection.updateOne(
          { _id: new ObjectId(foodId) },
          {
            $inc: {
              quantity: -orderQuantity,
              purchase_count: orderQuantity
            }
          }
        );

        res.send(result);
      } catch (err) {
        res.status(500).send({ message: err.message || 'Internal Server Error' });
      }
    })

    

    //foods related api here
    //get all foods
    app.get('/foods', async (req, res) => {
      //search on all foods
      const searchParams = req.query.search;
      let query = {};
      if (searchParams) {
        query = {
          food_name: { $regex: searchParams, $options: 'i' }
        };
      }

      const result = await foodsCollection.find(query).toArray();
      res.send(result);

    })

    // Get all foods added by a specific user (via email)
    app.get('/my-foods', async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: 'Email query is required' });
      }

      const query = { user_email: email };
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    });


    //get a single food by id
    app.get('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    })

    //edit a food by id
    app.put('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ message: 'Email query is required' });
      }
      const updatedFood = req.body;
      const query = { _id: new ObjectId(id), user_email: email };
      const options = { upsert: false };
      const updateDoc = {
        $set: updatedFood,
      };
      const result = await foodsCollection.updateOne(query, updateDoc, options);
      if (result.matchedCount === 0) {
        return res.status(403).send({ message: 'You are not authorized to edit this food or it does not exist.' });
      }
      res.send(result);
    })

    //delete a food by id
    app.delete('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ message: 'Email query is required' });
      }
      const query = { _id: new ObjectId(id), user_email: email };
      const result = await foodsCollection.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(403).send({ message: 'You are not authorized to delete this food or it does not exist.' });
      }
      res.send(result);
    })

     // Get top 6 foods by purchase_count
    app.get('/top-foods', async (req, res) => {
      const result = await foodsCollection.find({})
        .sort({ purchase_count: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    //post a new food
    app.post('/foods', async (req, res) => {
      const newFood = req.body;
      const result = await foodsCollection.insertOne(newFood);
      res.send(result);
    })

   





    //default server running
    app.get('/', (req, res) => {
      res.send('Server is running')
    })

    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});