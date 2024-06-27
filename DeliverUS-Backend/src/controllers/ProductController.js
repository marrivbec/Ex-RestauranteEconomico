import { Product, Order, Restaurant, RestaurantCategory, ProductCategory } from '../models/models.js'
import Sequelize from 'sequelize'

const indexRestaurant = async function (req, res) {
  try {
    const products = await Product.findAll({
      where: {
        restaurantId: req.params.restaurantId
      },
      include: [
        {
          model: ProductCategory,
          as: 'productCategory'
        }]
    })
    res.json(products)
  } catch (err) {
    res.status(500).send(err)
  }
}

const show = async function (req, res) {
  // Only returns PUBLIC information of products
  try {
    const product = await Product.findByPk(req.params.productId, {
      include: [
        {
          model: ProductCategory,
          as: 'productCategory'
        }]
    }
    )
    res.json(product)
  } catch (err) {
    res.status(500).send(err)
  }
}

const create = async function (req, res) {
  let newProduct = Product.build(req.body)
  try {
    newProduct = await newProduct.save()
    await economicRestaurant(req.body.restaurantId)
    res.json(newProduct)
  } catch (err) {
    res.status(500).send(err)
  }
}

const update = async function (req, res) {
  try {
    await Product.update(req.body, { where: { id: req.params.productId } })
    const updatedProduct = await Product.findByPk(req.params.productId)
    await economicRestaurant(updatedProduct.restaurantIdrestaurantId)
    res.json(updatedProduct)
  } catch (err) {
    res.status(500).send(err)
  }
}

const destroy = async function (req, res) {
  try {
    const result = await Product.destroy({ where: { id: req.params.productId } })
    let message = ''
    if (result === 1) {
      message = 'Sucessfuly deleted product id.' + req.params.productId
    } else {
      message = 'Could not delete product.'
    }
    await economicRestaurant(result.restaurantId)
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

const popular = async function (req, res) {
  try {
    const topProducts = await Product.findAll(
      {
        include: [{
          model: Order,
          as: 'orders',
          attributes: []
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'description', 'address', 'postalCode', 'url', 'shippingCosts', 'averageServiceMinutes', 'email', 'phone', 'logo', 'heroImage', 'status', 'restaurantCategoryId'],
          include:
        {
          model: RestaurantCategory,
          as: 'restaurantCategory'
        }
        }
        ],
        attributes: {
          include: [
            [Sequelize.fn('SUM', Sequelize.col('orders.OrderProducts.quantity')), 'soldProductCount']
          ],
          separate: true
        },
        group: ['orders.OrderProducts.productId'],
        order: [[Sequelize.col('soldProductCount'), 'DESC']]
      // limit: 3 //this is not supported when M:N associations are involved
      })
    res.json(topProducts.slice(0, 3))
  } catch (err) {
    res.status(500).send(err)
  }
}

const economicRestaurant = async function (restaurantId) {
  // Calculamos la media de los productos de los otros restaurantes
  const averagePriceOfRestaurants = await Product.findOne({
    where: { restaurantId: { [Sequelize.Op.ne]: restaurantId } },
    attributes: [[Sequelize.fn('AVG', Sequelize.col('price')), 'avgPrice']]
  })

  // Calculamos la media de mi restaurante
  const averagePriceOfMyRestaurants = await Product.findOne({
    where: { restaurantId: { [Sequelize.Op.eq]: restaurantId } },
    attributes: [[Sequelize.fn('AVG', Sequelize.col('price')), 'avgPrice']]
  })

  const restaurant = await Restaurant.findByPk(restaurantId)
  if (averagePriceOfMyRestaurants !== null && averagePriceOfRestaurants !== null) {
    if (averagePriceOfMyRestaurants.dataValues.avgPrice < averagePriceOfRestaurants.dataValues.avgPrice) {
      restaurant.isEconomic = true
    } else {
      restaurant.isEconomic = false
    }
  }

  await restaurant.save()
}

const ProductController = {
  indexRestaurant,
  show,
  create,
  update,
  destroy,
  popular,
  economicRestaurant
}
export default ProductController
