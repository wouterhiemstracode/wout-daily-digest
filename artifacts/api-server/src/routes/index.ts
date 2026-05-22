import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import sendersRouter from "./senders";
import emailsRouter from "./emails";
import digestsRouter from "./digests";
import feedbackRouter from "./feedback";
import searchRouter from "./search";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/senders", sendersRouter);
router.use("/emails", emailsRouter);
router.use("/digests", digestsRouter);
router.use("/feedback", feedbackRouter);
router.use("/search", searchRouter);
router.use("/stats", statsRouter);

export default router;
