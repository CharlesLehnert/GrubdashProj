const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");
const { Stats } = require("fs");


// List the existing orders
function list(req, res) {
    res.json({ data: orders })
}

// Check that the order id exists
function orderExists(req, res, next) {
    const orderId = req.params.orderId
    const foundOrder = orders.find((order) => order.id === orderId)

    if (foundOrder) {
        res.locals.order = foundOrder
        return next();
    }
    next({
        status: 404,
        message: `Order id not found: ${req.params.orderId}`
    })
}
// List the order based on the id
function read(req, res) {
    res.json({ data: res.locals.order })
}


// Validation for the request post. Checks that all required properties are present
function orderDataHas(propertyName) {
    return function(req, res, next) {
        const { data = {} } = req.body;
        if (data[propertyName]) {
            return next();
        }
        next({ status: 400, message: `Must include a ${propertyName}` })
    };
}

// Validation for dish. Checks that the quantity for each dish is present, above zero, and an intger
function dishPropertyIsValid(req, res, next) {
    const { data: { dishes } = {} } = req.body;
    if (Array.isArray(dishes) && dishes.length > 0) {
        let badDishIndex = dishes.findIndex((dish) => !dish.quantity || dish.quantity <= 0 || !Number.isInteger(dish.quantity))
        if (badDishIndex >= 0) {
            next({
                status: 400,
                message: `Dish ${badDishIndex} must have a quantity that is an integer greater than 0`
            })
        }
        return next()
    }
    next({
        status: 400,
        message: `Order must include at least one dish`
    })
}
// Creates an order
function create(req, res) {
    const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body
    const newOrder = {
        id: nextId(),
        deliverTo: deliverTo,
        mobileNumber: mobileNumber,
        dishes: dishes
    }
    orders.push(newOrder)
    res.status(201).json({ data: newOrder })
}


// Check that the order id in the body matches the route id
function orderIdMatchesRoute(req, res, next) {
    const orderId = req.params.orderId;
    const { data: { id } = {} } = req.body;

    if (id) {
        if (orderId !== id) {
            next({
                status: 400,
                message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`
            })
        }
        next()
    }
    next()
}

// Check the status of the order. Checks that status is present, not delivered, not empty, and a valid status 
function statusIsValid(req, res, next) {
    const {data: {status}} = req.body
    const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"]
    if (status === "") {
        return next({
            status: 400,
            message: "Order must have a status of pending, preparing, out-for-delivery, delivered"
        })
    }
    if(status === "delivered") {
        return next({
            status: 400,
            message: "A delivered order cannot be changed"
        })
    }
    if(!status) {
        return next({
            status: 400,
            message: "Order must have a status of pending, preparing, out-for-delivery, delivered"
        })   
    }

    if (validStatus.includes(status)) {
        next()
    } else {
        return next({
            status: 400,
            message: "Order must have a status of pending, preparing, out-for-delivery, delivered"
        })
    }
}

// Updates an order
function update(req, res, next) {
    const { data: { id, deliverTo, mobileNumber, status, dishes} = {} } = req.body;
    res.locals.order.deliverTo = deliverTo;
    res.locals.order.mobileNumber = mobileNumber;
    res.locals.order.status = status;
    res.locals.order.dishes = dishes;
    res.json({ data: res.locals.order }); 
}  


// Delete order status check
function deleteStatusValid(req, res, next) {
    const {status} = res.locals.order

    if (status !== "pending") {
        return next({
            status: 400,
            message: "An order cannot be deleted unless its pending."
        })
    }
    next()
}

// Deletes an order 
function destroy(req, res) {
    const {orderId} = req.params
    const index = orders.findIndex((order) => order.id === orderId);

    if (index > -1) {
        orders.splice(index, 1)
    }
    res.sendStatus(204)
}


module.exports = {
    list,
    read: [ orderExists, read], 
    create: [
        orderDataHas("deliverTo"),
        orderDataHas("mobileNumber"),
        orderDataHas("dishes"),
        dishPropertyIsValid,
        create,
    ],
    update: [
        orderExists,
        orderIdMatchesRoute,
        orderDataHas("deliverTo"),
        orderDataHas("mobileNumber"),
        orderDataHas("dishes"),
        dishPropertyIsValid,
        statusIsValid,
        update
    ],
    delete: [
        orderExists,
        deleteStatusValid,
        destroy
    ]
}