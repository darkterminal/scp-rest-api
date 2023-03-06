import express from 'express'
import { getAllContributors } from './modules/contributors'
import { getAllStories, getStory } from './modules/collections'

const router = express.Router()

router.get('/', (req, res) => {
  res.json({
    message: 'API - Street Community Programmer v1.0.0'
  })
})

router.get('/contributors', getAllContributors)
router.get('/stories', getAllStories)
router.get('/story/:language', getStory)

export default router
