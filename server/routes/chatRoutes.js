import express from 'express';
const router = express.Router({ mergeParams: true });
import * as chatController from '../controllers/chatController.js';

router.get('/', chatController.getHistory);
router.post('/', chatController.chat);

export default router;
