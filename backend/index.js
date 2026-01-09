import http from "node:http";
import app from "./app.js";

const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

server.listen(PORT, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log(`server running on PORT ${PORT}`);
  }
});
