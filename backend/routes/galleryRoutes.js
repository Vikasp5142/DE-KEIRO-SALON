const express   = require('express');
const router    = express.Router();
const ctrl      = require('../controllers/galleryController');
const adminOnly = require('../middleware/requireAdminKey');

// ── Public route — the four mood cards on the homepage ──
router.get('/',            ctrl.getPrimaryGallery);   // GET /api/gallery

// ── Admin-only routes ──
router.get('/all',         adminOnly, ctrl.getAllGalleryItems);  // GET    /api/gallery/all
router.post('/',           adminOnly, ctrl.createGalleryItem);   // POST   /api/gallery
router.patch('/:id',       adminOnly, ctrl.updateGalleryItem);   // PATCH  /api/gallery/:id
router.delete('/:id',      adminOnly, ctrl.deleteGalleryItem);   // DELETE /api/gallery/:id

module.exports = router;
