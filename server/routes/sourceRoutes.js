import express from 'express';
const router = express.Router({ mergeParams: true });
import multer from 'multer';
import * as sourceController from '../controllers/sourceController.js';

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
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

export default router;
