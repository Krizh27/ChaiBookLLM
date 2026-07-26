import express from 'express';
const router = express.Router({ mergeParams: true });
import multer from 'multer';
import fs from 'fs';
import * as sourceController from '../controllers/sourceController.js';

// Ensure uploads directory exists on server startup
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.get('/', sourceController.getSources);
router.post('/', upload.single('file'), sourceController.uploadSource);
router.delete('/:sourceId', sourceController.deleteSource);
router.post('/:sourceId/reindex', sourceController.reindexSource);

export default router;
