require("dotenv").config();

const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");

const app = express();

process.env.SERVICE_NAME = process.env.SERVICE_NAME || "eventflow-notification-service";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.redirect("/health"));
app.use(healthRoutes);

const port = Number(process.env.PORT || 3004);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[${process.env.SERVICE_NAME}] listening on port ${port}`);
});

