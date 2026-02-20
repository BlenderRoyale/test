import BubbleContactApp from "./bubble_contact.js";
import { createWebSDK } from "./web_sdk.js";

const sdk = createWebSDK({ rootId: "root" });
const app = new BubbleContactApp(sdk);

app.open();
