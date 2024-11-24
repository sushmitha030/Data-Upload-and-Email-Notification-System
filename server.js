const express = require("express")
require('dotenv').config()
const Routes = require("./routes/route")
const app = express()

app.use(express.json());

const router = express.Router();
Routes(router);
app.use(router);

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});