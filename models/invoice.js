"use strict";

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    moment = require('moment'),
    async = require('async'),
    Schema = mongoose.Schema,
    ObjectId = mongoose.Schema.Types.ObjectId,
    timestamps = require('mongoose-timestamp');

var DataTable = require('mongoose-datatable');

DataTable.configure({
    verbose: false,
    debug: false
});
mongoose.plugin(DataTable.init);

var Dict = INCLUDE('dict');

var setPrice = MODULE('utils').setPrice;
var setDate = MODULE('utils').setDate;
const round = MODULE('utils').round;

/**
 * Article Schema
 */
var billSchema = new Schema({
    forSales: { type: Boolean, default: true },
    ref: { type: String, index: true },
    isremoved: Boolean,
    ID: { type: Number },
    /*title: {//For internal use only
     ref: String,
     autoGenerated: {type: Boolean, default: false} //For automatic process generated bills
     },*/
    currency: {
        _id: { type: String, ref: 'currency', default: '' },
        rate: { type: Number, default: 1 } // changed default to '0' for catching errors
    },
    Status: { type: String, default: 'DRAFT' },
    cond_reglement_code: {
        type: String,
        default: 'RECEP'
    },
    mode_reglement_code: {
        type: String,
        default: 'TIP'
    },
    bank_reglement: { type: ObjectId, ref: 'bank' },
    //availability_code: {type: String, default: 'AV_NOW'},
    type: {
        type: String,
        default: 'SRC_COMM'
    },
    supplier: { type: Schema.Types.ObjectId, ref: 'Customers', require: true },
    contacts: [{ type: Schema.Types.ObjectId, ref: 'Customers' }],
    ref_client: { type: String, default: "" },

    imported: { type: Boolean, default: false }, //imported in accounting
    journalId: [Schema.Types.ObjectId], // Id transactions for accounting

    orders: [{ type: Schema.Types.ObjectId, ref: 'order' }],

    datec: { type: Date, default: new Date, set: setDate },
    dater: { type: Date, set: setDate }, // date limit reglement
    dateOf: { type: Date }, // Periode de facturation du
    dateTo: { type: Date }, // au
    notes: [{
        title: String,
        note: String,
        public: {
            type: Boolean,
            default: false
        },
        edit: {
            type: Boolean,
            default: false
        }
    }],
    discount: {
        escompte: {
            percent: { type: Number, default: 0 },
            value: { type: Number, default: 0, set: setPrice } // total remise globale
        },
        discount: {
            percent: { type: Number, default: 0 }, //discount
            value: { type: Number, default: 0, set: setPrice } // total remise globale
        }
    },
    total_ht: {
        type: Number,
        default: 0,
        set: setPrice
    },
    correction: {
        type: Number,
        default: 0,
        set: setPrice
    },
    total_taxes: [{
        _id: false,
        taxeId: { type: Schema.Types.ObjectId, ref: 'taxes' },
        value: { type: Number, default: 0 }
    }],
    total_ttc: { type: Number, default: 0, set: setPrice },
    total_paid: { type: Number, default: 0, set: setPrice },
    shipping: {
        total_ht: {
            type: Number,
            default: 0,
            set: setPrice
        },
        total_taxes: [{
            _id: false,
            taxeId: { type: Schema.Types.ObjectId, ref: 'taxes' },
            value: { type: Number, default: 0 }
        }],
        /*total_ttc: {
            type: Number,
            default: 0
        }*/
    },
    createdBy: { type: ObjectId, ref: 'Users' },
    editedBy: { type: ObjectId, ref: 'Users' },
    salesPerson: { type: ObjectId, ref: 'Employees' }, //commercial_id
    salesTeam: { type: ObjectId, ref: 'Department' },
    entity: String,
    optional: Schema.Types.Mixed,
    delivery_mode: { type: String, default: "Comptoir" },
    billing: { type: Schema.Types.ObjectId, ref: 'Customers' },
    //costList: { type: ObjectId, ref: 'priceList', default: null }, //Not used
    //priceList: { type: ObjectId, ref: 'priceList', default: null },

    address: {
        name: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        zip: { type: String, default: '' },
        country: { type: String, ref: 'countries', default: 'FR' },
        contact: {
            name: { type: String, default: '' },
            phone: { type: String, set: MODULE('utils').setPhone, default: '' },
            mobile: { type: String, set: MODULE('utils').setPhone, default: '' },
            fax: { type: String, set: MODULE('utils').setPhone, default: '' },
            email: { type: String, lowercase: true, trim: true, index: true }
        }
    },
    weight: { type: Number, default: 0 }, // Poids total
    lines: [{
        _id: false,
        //pu: {type: Number, default: 0},
        type: { type: String, default: 'product' }, //Used for subtotal
        refProductSupplier: String, //Only for an order Supplier
        qty: { type: Number, default: 0 },
        /*taxes: [{
            _id: false,
            taxeId: { type: Schema.Types.ObjectId, ref: 'taxes' },
            value: { type: Number }
        }],*/
        //price_base_type: String,
        //title: String,
        priceSpecific: { type: Boolean, default: false },
        pu_ht: {
            type: Number,
            default: 0
        },
        description: String,
        private: String, // Private note
        product_type: String,
        product: { type: Schema.Types.ObjectId, ref: "product" },
        total_taxes: [{
            _id: false,
            taxeId: { type: Schema.Types.ObjectId, ref: 'taxes' },
            value: { type: Number }
        }],
        /*total_ttc: {
            type: Number,
            default: 0
        },*/
        discount: { type: Number, default: 0 },
        total_ht: { type: Number, default: 0, set: setPrice },
        //weight: { type: Number, default: 0 },
        optional: { type: Schema.Types.Mixed }
    }],
    history: [{
        date: { type: Date, default: Date.now },
        author: { type: ObjectId, ref: 'Users' },
        mode: String, //email, order, alert, new, ...
        Status: String,
        msg: String
    }],
    //feeBilling: { type: Boolean, default: true }, // Frais de facturation
    oldId: String // Only for import migration
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

billSchema.plugin(timestamps);

// Gets listing
billSchema.statics.query = function(options, callback) {
    var self = this;

    // options.query {}
    // options.fileds {String}
    // options.page {String or Number}
    // options.max {String or Number}
    // options.id {String}

    options.page = U.parseInt(options.page) - 1;
    options.max = U.parseInt(options.max, 20);
    if (options.id && typeof(options.id) === 'string')
        options.id = options.id.split(',');
    if (options.page < 0)
        options.page = 0;
    var take = U.parseInt(options.max);
    var skip = U.parseInt(options.page * options.max);

    var query = options.query;
    if (!query.isremoved)
        query.isremoved = { $ne: true };

    //if (options.search)
    //    builder.in('search', options.search.keywords(true, true));
    if (options.id) {
        if (typeof options.id === 'object')
            options.id = { '$in': options.id };
        query._id = options.id;
    }

    var sort = "ref";

    if (options.sort)
        sort = options.sort;

    //console.log(query);

    this.find(query)
        .select(options.fields)
        .limit(take)
        .skip(skip)
        //.populate('category', "_id path url linker name")
        .sort(sort)
        //.lean()
        .exec(function(err, doc) {
            //console.log(doc);
            var data = {};
            data.count = doc.length;
            data.items = doc;
            data.limit = options.max;
            data.pages = Math.ceil(data.count / options.max);

            if (!data.pages)
                data.pages = 1;
            data.page = options.page + 1;
            callback(null, data);
        });
};

billSchema.statics.getById = function(id, callback) {
    var self = this;
    var ObjectId = MODULE('utils').ObjectId;

    //TODO Check ACL here
    var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
    var query = {};

    if (checkForHexRegExp.test(id))
        query = {
            _id: id
        };
    else
        query = {
            ref: id
        };

    //console.log(query);

    async.waterfall([
            function(wCb) {
                self.findOne(query, "-latex")
                    .populate("contacts", "name phone email")
                    .populate({
                        path: "supplier",
                        select: "name salesPurchases",
                        populate: { path: "salesPurchases.priceList" }
                    })
                    .populate({
                        path: "lines.product",
                        select: "taxes info weight units",
                        //populate: { path: "taxes.taxeId" }
                    })
                    .populate({
                        path: "lines.total_taxes.taxeId"
                    })
                    .populate({
                        path: "total_taxes.taxeId"
                    })
                    .populate("createdBy", "username")
                    .populate("editedBy", "username")
                    .populate("offer", "ref total_ht forSales")
                    .populate("order", "ref total_ht forSales")
                    .populate("orders", "ref total_ht forSales")
                    .populate('invoiceControl')
                    .populate('project', '_id name')
                    .populate('shippingMethod', '_id name')
                    .populate('workflow', '_id name status')
                    .exec(wCb);
            }
        ],
        function(err, invoice) {
            if (err)
                return callback(err);

            return callback(err, invoice);
        });
};

billSchema.statics.setInvoiceNumber = function(invoice, callback) {
    var SeqModel = MODEL('Sequence').Schema;
    var EntityModel = MODEL('entity').Schema;

    if (!invoice || invoice.Status == 'DRAFT' || invoice.total_ttc === 0)
        return callback(null, invoice);

    if (invoice.ref.substr(0, 4) !== "PROV")
        return callback(null, invoice);

    if (invoice.forSales == true)
        return SeqModel.inc("INVOICE", function(seq, number) {
            //console.log(seq);
            invoice.ID = number;
            EntityModel.findOne({
                _id: invoice.entity
            }, "cptRef", function(err, entity) {
                if (err)
                    console.log(err);

                if (entity && entity.cptRef)
                    invoice.ref = (invoice.total_ttc < 0 ? "AV" : "FA") + entity.cptRef + seq;
                else
                    invoice.ref = (invoice.total_ttc < 0 ? "AV" : "FA") + seq;

                callback(null, invoice);
            });
        });
};

/**
 * Pre-save hook
 */
billSchema.pre('save', function(next) {

    var self = this;
    var SeqModel = MODEL('Sequence').Schema;
    var EntityModel = MODEL('entity').Schema;

    this.dater = MODULE('utils').calculate_date_lim_reglement(this.datec, this.cond_reglement_code);

    if (this.isNew)
        this.history = [];

    if (self.total_ttc === 0)
        self.Status = 'DRAFT';

    if (!self.ref && self.isNew) {
        if (self.forSales == true)
            return SeqModel.inc("PROV", function(seq, number) {
                //console.log(seq);
                self.ID = number;
                self.ref = "PROV" + seq;
                next();
            });
        //supplier invoice
        return SeqModel.inc("SUPPLIER_INVOICE", function(seq, number) {
            //console.log(seq);
            self.ID = number;
            EntityModel.findOne({
                _id: self.entity
            }, "cptRef", function(err, entity) {
                if (err)
                    console.log(err);

                /*if (entity && entity.cptRef)
                    invoice.ref = "FF" + entity.cptRef + seq;
                else*/
                self.ref = "FF" + seq;
                next();
            });
        });
    }


    self.ref = F.functions.refreshSeq(self.ref, self.datec);
    next();
});

/*var statusList = {};
Dict.dict({ dictName: 'fk_bill_status', object: true }, function(err, doc) {
    if (err) {
        console.log(err);
        return;
    }
    statusList = doc;
});*/

exports.Status = {
    "_id": "fk_bill_status",
    "lang": "orders",
    "values": {
        "DRAFT": {
            "enable": true,
            "label": "BillStatusDraft",
            "cssClass": "ribbon-color-default label-default",
            "system": true
        },
        "VALIDATED": {
            "enable": true,
            "label": "BillStatusValidated",
            "cssClass": "ribbon-color-success label-success"
        },
        "NOT_PAID": {
            "enable": true,
            "label": "BillStatusNotPaid",
            "cssClass": "ribbon-color-danger label-danger",
            "system": true
        },
        "PAID": {
            "enable": true,
            "label": "BillShortStatusPaid",
            "cssClass": "ribbon-color-success label-success",
            "system": true
        },
        "PAID_PARTIALLY": {
            "enable": true,
            "label": "BillStatusClosedPaidPartially",
            "cssClass": "ribbon-color-info label-info",
            "system": true
        },
        "CANCELED": {
            "enable": true,
            "label": "BillStatusCanceled",
            "cssClass": "ribbon-color-warning label-warning",
            "system": true
        },
        "CONVERTED_TO_REDUC": {
            "enable": true,
            "label": "BillStatusConvertedToReduc",
            "cssClass": "ribbon-color-success label-success",
            "system": true
        },
        "PAID_BACK": {
            "enable": true,
            "label": "BillShortStatusPaid",
            "cssClass": "ribbon-color-success label-success",
            "system": true
        }
    }
};

billSchema.virtual('_status')
    .get(function() {
        var res_status = {};

        var status = this.Status;
        var statusList = exports.Status;

        if (status === 'NOT_PAID' && this.dater > moment().subtract(10, 'days').toDate()) //Check if late
            status = 'VALIDATED';

        if (status && statusList.values[status] && statusList.values[status].label) {
            //console.log(this);
            res_status.id = status;
            res_status.name = i18n.t(statusList.lang + ":" + statusList.values[status].label);
            //res_status.name = statusList.values[status].label;
            res_status.css = statusList.values[status].cssClass;
        } else { // By default
            res_status.id = status;
            res_status.name = status;
            res_status.css = "";
        }
        return res_status;

    });

/*var transactionList = [];
 
 TransactionModel.aggregate([
 {$group: {
 _id: '$bill.id',
 sum: {$sum: '$credit'}
 }}
 ], function (err, doc) {
 if (err)
 return console.log(err);
 
 transactionList = doc;
 });*/

billSchema.virtual('amount').get(function() {

    var amount = {};
    var id = this._id;



    /*if (transactionList) {
     for (var i = 0; i < transactionList.length; i++) {
     if (id.equals(transactionList[i]._id)) {
     amount.rest = this.total_ttc - transactionList[i].sum;
     amount.set = transactionList[i].sum;
     return amount;
     }
     }
     }*/

    return this.total_ttc - this.total_paid;
});


exports.Schema = mongoose.model('invoice', billSchema, 'Invoices');
exports.name = 'invoice';

F.on('load', function() {
    // Refresh pack prices from directCost
    F.functions.BusMQ.subscribe('invoice:recalculateStatus', function(data) {
        const BillModel = MODEL('invoice').Schema;
        const TransactionModel = MODEL('transaction').Schema;
        const ObjectId = MODULE('utils').ObjectId;

        //console.log(data);
        console.log("Update emit invoice", data);

        if (!data.invoice || !data.invoice._id)
            return;

        BillModel.findById(data.invoice._id, "_id isremoved total_ttc", function(err, bill) {
            if (err)
                return console.log(err);

            if (!bill)
                return console.log("No bill found");

            if (bill.isremoved)
                return BillModel.update({ _id: bill._id }, { $set: { updatedAt: new Date(), total_ttc: 0, total_paid: 0, total_ht: 0 } }, function(err, doc) {
                    if (err)
                        return console.log(err);
                });

            TransactionModel.aggregate([{
                    $match: { "meta.bills.invoice": ObjectId(data.invoice._id), voided: false, "meta.bank": { $ne: null } }
                }, {
                    $unwind: {
                        path: '$meta.bills'
                    }
                }, {
                    $match: { "meta.bills.invoice": ObjectId(data.invoice._id) }
                }, {
                    $group: { _id: null, amount: { $sum: "$meta.bills.amount" } }
                }],
                function(err, doc) {
                    if (err)
                        return console.log(err);

                    console.log(doc);

                    if (!doc || doc.length == 0)
                        return;

                    let payment = doc[0].amount;
                    console.log(payment);

                    var status = "STARTED";
                    if (round(payment, 2) >= round(bill.total_ttc, 2))
                        status = "PAID";

                    if (round(payment, 2) <= 0)
                        status = "NOT_PAID";

                    BillModel.update({ _id: bill._id }, { $set: { Status: status, updatedAt: new Date(), total_paid: payment } }, function(err, doc) {
                        if (err)
                            return console.log(err);
                        console.log(doc);
                    });
                });
        });
    });
});