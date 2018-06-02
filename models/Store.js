const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter a store name!',
    },
    slug: String,
    description: {
        type: String,
        trim: true 
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now(), 
    },
    location: {
        type:{
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates!'
        }],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Define our indexes
storeSchema.index({
    name: 'text',
    description: 'text'
});

storeSchema.index({ location: '2dsphere'});

storeSchema.pre('save', async function(next){
    if(!this.isModified('name')){
        next();
        return; //stop this function from running
    }
    this.slug = slug(this.name);
    //Find others stores that have a same slug and add numbers store1, store2, store3
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i')
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx });

    if(storesWithSlug.length){
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }

    next();
})

storeSchema.statics.getTagsList = function(){
    // this => bound to the model
    return this.aggregate([
        // operator that will print the store for many tags as it has
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1} } },
        { $sort: { count: -1 } }
    ]);
}

storeSchema.statics.getTopStores = function(){
    return this.aggregate([
        //Lookup Stores and populate their reviews
        { 
        $lookup: 
            {from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews'} 
        },
        // filter for only items that have 2 or more reviews
        { $match: { 'reviews.1': { $exists: true} }},
        // Add the average reviews field
        { $addFields: { 
            averageRating: { $avg: '$reviews.rating' }
        }},
        // Em versões antigas do mongodb, { $project: { photo: '$$ROOT.photo', name: '$ROOT.name', reviews: '$$ROOT.reviews', averageRating: { $avg: '$reviews.rating' } } }
        // sort it by our new field, highest reviews first
        { $sort: { averageRating: -1 } },
        // limit to at most 10
        { $limit: 10 }
    ])
}

function autopopulate(next){
    this.populate('reviews');
    next();
}

// find reviews where the sotres _id property === reviews store property
storeSchema.virtual('reviews', {
    ref: 'Review', // what model to link ?
    localField: '_id', // which field on the store ?
    foreignField: 'store' // which field on the review ?
});

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);