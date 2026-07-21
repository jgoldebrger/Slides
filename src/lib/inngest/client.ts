import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "updatedeck",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
