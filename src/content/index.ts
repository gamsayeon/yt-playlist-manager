import { injectCheckboxes } from "./checkbox";
import { onMutation } from "./observer";

console.log("[YT Playlist Manager] content script loaded");

injectCheckboxes();

onMutation(() => {
  injectCheckboxes();
});