const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// Lists all the existing dishes
function list(req, res) {
    res.json({ data: dishes })
}

// Check if the dishId/dish exists
function dishExists(req, res, next) {
    const dishId = req.params.dishId;
    const foundDish = dishes.find((dish) => dish.id === dishId);

    if (foundDish) {
        res.locals.dish = foundDish;
        return next();
    }
    next({
        status: 404, 
        message: `Dish does not exist: ${req.params.dishId}`
    })
}

// List the dish based in the dishId
function read(req, res) {
    res.json({ data: res.locals.dish })
}


// Validation for the requested POST. Checks that all required propertires are present
function dishDataHas(propertyName) {
    return function(req, res, next) {
        const { data = {} } = req.body;

        if (data[propertyName]) {
            return next();
        }
        next({ status: 400, message: `Must include a ${propertyName}` });
    };
}

// Validtion for the price. Checks that the price is above zero and an integer
function pricePropertyIsValid(req, res, next) {
    const { data: { price } = {} } = req.body;

    if (price <= 0 || !Number.isInteger(price)) {
        return next({
            status: 400, 
            message: `price`
        });
    }
    next();
}

// Creates a new dish
function create(req, res) {
    const { data: { name, description, price, image_url } = {} } = req.body
    const newDish = {
        id: nextId(),
        name: name,
        description: description,
        price: price,
        image_url: image_url
    }
    dishes.push(newDish);
    res.status(201).json({ data: newDish })
}


// Check that the dish id in the body matches the route id
function dishIdMatchesRoute(req, res, next) {
    const dishId = req.params.dishId;
    const { data: { id } = {} } = req.body;

    if (id) {
        if (dishId !== id) {
            next({
                status: 400,
                message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`
            })
        }
    }
    next()
}

// Update the dish based in the dishId
function update(req, res) {
    let foundDish = res.locals.dish;
    const { data: { name, description, price, image_url } = {} } = req.body
    let updatedDish = {
        id: foundDish.id,
        name: name,
        description: description,
        price: price,
        image_url: image_url
    }
    foundDish = updatedDish

    res.json({ data: foundDish })
}



module.exports = {
    list,
    read: [dishExists, read],
    create: [
        dishDataHas("name"),
        dishDataHas("description"),
        dishDataHas("price"),
        dishDataHas("image_url"),
        pricePropertyIsValid,
        create
    ],
    update: [
        dishExists,
        dishDataHas("name"),
        dishDataHas("description"),
        dishDataHas("price"),
        dishDataHas("image_url"),
        pricePropertyIsValid,
        dishIdMatchesRoute,
        update
    ]
}