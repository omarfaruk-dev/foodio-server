# Foodio Server

A robust Node.js/Express backend API for the Foodio restaurant management application, providing comprehensive food ordering, user management, and wishlist functionality.

## 🚀 Features

- **Food Management**: CRUD operations for food items
- **Order Processing**: Complete order lifecycle with stock management
- **Wishlist System**: Add/remove foods from user wishlists
- **Authentication**: Firebase Admin SDK integration
- **Database**: MongoDB with aggregation pipelines
- **Security**: JWT token verification and CORS protection

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: Firebase Admin SDK
- **Security**: CORS, JWT Token Verification
- **Deployment**: Vercel

## 📦 Dependencies

```json
{
  "cors": "^2.8.5",
  "dotenv": "^16.5.0", 
  "express": "^5.1.0",
  "firebase-admin": "^13.4.0",
  "mongodb": "^6.16.0"
}
```

## 🔧 Installation

1. **Clone the repository**
```bash
git clone https://github.com/omarfaruk-dev/foodio-server.git
cd foodio-server
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```env
PORT=3000
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
FB_SERVICE_KEY=your_base64_encoded_firebase_service_key
```

4. **Firebase Service Key Setup**
```bash
# Convert your Firebase service key to base64
node keyConvert.js
# Copy the output and paste it as FB_SERVICE_KEY in .env
```

## 🚀 Running the Server

### Development
```bash
npm start
```

### Production (Vercel)
```bash
vercel --prod
```

## 📚 API Endpoints

### 🍕 Foods

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/foods` | Get all foods (with search) | No |
| GET | `/foods/:id` | Get single food by ID | No |
| GET | `/top-foods` | Get top 8 foods by sales | No |
| GET | `/my-foods?email=` | Get user's foods | Yes |
| POST | `/foods` | Add new food | No |
| PUT | `/foods/:id?email=` | Update food | No |
| DELETE | `/foods/:id?email=` | Delete food | No |

### 🛒 Orders

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/my-orders?email=` | Get user's orders with food details | Yes |
| POST | `/orders` | Create new order | No |
| DELETE | `/my-orders/:orderId` | Delete order | No |

### ❤️ Wishlist

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/wishlist?email=` | Get user's wishlist with food details | Yes |
| POST | `/wishlist?email=` | Add food to wishlist | Yes |
| DELETE | `/wishlist/:id?email=` | Remove food from wishlist | Yes |

## 🔐 Authentication

All protected endpoints require Firebase ID token in the Authorization header:

```javascript
headers: {
  'Authorization': 'Bearer <firebase-id-token>'
}
```

### Token Verification Middleware
```javascript
const verifyFireBaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};
```

## 🗄️ Database Schema

### Foods Collection
```javascript
{
  _id: ObjectId,
  food_name: String,
  food_img: String,
  food_origin: String,
  food_category: String,
  price: Number,
  quantity: Number,
  purchase_count: Number,
  user_email: String,
  created_at: Date
}
```

### Orders Collection
```javascript
{
  _id: ObjectId,
  foodId: ObjectId,
  buyer_email: String,
  order_quantity: Number,
  order_date: Date
}
```

### Wishlist Collection
```javascript
{
  _id: ObjectId,
  foodId: ObjectId,
  user_email: String,
  added_at: Date
}
```

## 🔄 Aggregation Pipelines

### Orders with Food Details
```javascript
ordersCollection.aggregate([
  { $match: { buyer_email: email } },
  {
    $addFields: {
      foodIdObj: {
        $cond: [
          { $eq: [{ $type: "$foodId" }, "objectId"] },
          "$foodId",
          { $toObjectId: "$foodId" }
        ]
      }
    }
  },
  {
    $lookup: {
      from: "foods",
      localField: "foodIdObj", 
      foreignField: "_id",
      as: "food_info"
    }
  },
  {
    $unwind: {
      path: "$food_info",
      preserveNullAndEmptyArrays: true
    }
  }
])
```

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

4. **Environment Variables**
Set these in Vercel dashboard:
- `DB_USER`
- `DB_PASS` 
- `FB_SERVICE_KEY`
- `PORT`

## 🔧 Configuration

### MongoDB Connection
```javascript
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2vxppji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
```

### Firebase Admin Setup
```javascript
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

## 📁 Project Structure

```
foodio-server/
├── index.js              # Main server file
├── keyConvert.js         # Firebase key converter
├── package.json          # Dependencies
├── vercel.json           # Vercel configuration
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🔒 Security Features

- **CORS Protection**: Configured for cross-origin requests
- **JWT Verification**: Firebase ID token validation
- **Input Validation**: ObjectId validation and data sanitization
- **Authorization**: User-specific data access control
- **Error Handling**: Comprehensive error responses

## 🐛 Error Handling

All endpoints include proper error handling:

```javascript
try {
  // API logic
} catch (err) {
  res.status(500).send({ 
    message: err.message || "Internal Server Error" 
  });
}
```

## 📊 Response Format

### Success Response
```javascript
{
  "acknowledged": true,
  "insertedId": "ObjectId"
}
```

### Error Response
```javascript
{
  "message": "Error description"
}
```

## 🔄 Stock Management

The system automatically manages food stock:

- **Order Creation**: Decreases `quantity`, increases `purchase_count`
- **Order Deletion**: Restores `quantity`, decreases `purchase_count`
- **Stock Validation**: Prevents overselling

## 🌐 CORS Configuration

```javascript
app.use(cors());
```

Allows cross-origin requests from the frontend application.

## 📝 License

ISC License

## 👨‍💻 Author

Foodio Development Team

---

**Server Status**: ✅ Running  
**Database**: ✅ Connected  
**Authentication**: ✅ Configured  
**Deployment**: ✅ Vercel Ready
