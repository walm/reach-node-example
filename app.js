const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios');
const app = express()



// some config from environment, see env.sh
// ----------------------------------------
const PORT = process.env.PORT
const CALLBACK_BASE = process.env.CALLBACK_BASE
const REACH_TOKEN = process.env.REACH_TOKEN // this should never be shared to frontend


// base reach api clients
// ---------------------
const reach = axios.create({
  baseURL: 'https://www.reveapp.com/api/',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${REACH_TOKEN}`
  }
})

const track = axios.create({
  baseURL: 'https://track.reach.shopping/v1/',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${REACH_TOKEN}`
  }
})


// simple product cache
const products = []

// endpoints for our app
// ---------------------
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))

// products we sell, getting it from reach product query api
app.get('/products', async (req, res) => {
  const payload = {
    query: 'vendor:adlibris',
    country: 'SE'
  }
  // return from cache if we have it
  // if (products.length > 0) return res.json(products)

  // to keep it simple, we are skipping error handling
  const result = await reach.post('feed/products', payload)
  products.splice(0, products.length) // clear cache
  products.push(...result.data.products)
  res.json(products)
})


// trigger reach track for product in backend
app.get('/track', async (req, res) => {
  await track.get(`track?url=${encodeURIComponent(req.query.url)}`)
  res.status(204).end()
})


// create a reach checkout from passed product and it's attributes
app.post('/checkout', async (req, res) => {
  const productUrl = req.body.url
  const hasParams = productUrl.indexOf('?') !== -1
  const item = {
    url: productUrl,
    botUrl: `${productUrl}${hasParams?'&':'?'}utm_source=ReachExample`,
    price: req.body.price, // to keep it simple we post in price
    attributes: {
      size: req.body.size,
      color: req.body.color
    }
  }

  const payload = {
    items: [item],
    callback: {
      success: `${CALLBACK_BASE}callback?ref=123&success=true`,
      fail: `${CALLBACK_BASE}callback?ref=123&success=true`
    },
    test: true
  }

  // to keep it simple, we are skipping error handling
  const result = await reach.post('checkout', payload)
  const checkout = result.data
  res.json({ id: checkout.id, checkoutUrl: checkout.checkoutUrl })
})


// get callback from reah on checkout success/fail
app.get('/callback', (req, res) => {
  console.log(`Callback from Reach on ref:${req.query.ref} success:${req.query.success}`)
  res.status(200).end()
})



// let's serv app on configured port
app.listen(PORT, () => console.log(`Reach example app listening on port ${PORT}!`))
