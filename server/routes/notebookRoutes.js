import express from 'express';
const router = express.Router();
import * as notebookController from '../controllers/notebookController.js';

router.get('/', notebookController.getNotebooks);
router.get('/:id', notebookController.getNotebookById);
router.post('/', notebookController.createNotebook);
router.put('/:id', notebookController.updateNotebook);
router.delete('/:id', notebookController.deleteNotebook);

export default router;
