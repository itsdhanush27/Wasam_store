const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    asin: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    title: {
        type: String,
        required: true
    },
    price: {
        type: String, // Storing as string to preserve formatting like "$19.99"
        default: 'Check Price'
    },
    image: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'General'
    },
    rating: {
        type: String,
        default: 'N/A'
    },
    reviews: {
        type: Number,
        default: 0
    },
    isBestSeller: {
        type: Boolean,
        default: false
    },
    lastScraped: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);
