import express from 'express'
import morgan from 'morgan'
import helmet from 'helmet'
import cors from 'cors'

import 'dotenv/config'

import middlewares from './middlewares'
import scp from './api/scp'

const app = express()

app.use(morgan('dev'))
app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    message: '🦄🌈✨👋🌎🌍🌏✨🌈🦄'
  })
})

app.use('/api/v1', scp)

app.use(middlewares.notFound)
app.use(middlewares.errorHandler)

export default app
