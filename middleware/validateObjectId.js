const mongoose = require('mongoose');

/**
 * Middleware to validate MongoDB ObjectId parameters
 * Prevents crashes from invalid ObjectId format in route params
 * 
 * @param {string} paramName - The name of the route parameter to validate (default: 'id')
 * @returns {Function} Express middleware function
 */
const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id) {
            return res.status(400).json({ 
                msg: `Missing required parameter: ${paramName}` 
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                msg: `Invalid ${paramName} format. Expected a valid MongoDB ObjectId.` 
            });
        }
        
        next();
    };
};

/**
 * Validate multiple ObjectId parameters at once
 * @param {string[]} paramNames - Array of parameter names to validate
 * @returns {Function} Express middleware function
 */
const validateMultipleObjectIds = (paramNames) => {
    return (req, res, next) => {
        for (const paramName of paramNames) {
            const id = req.params[paramName];
            
            if (id && !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ 
                    msg: `Invalid ${paramName} format. Expected a valid MongoDB ObjectId.` 
                });
            }
        }
        
        next();
    };
};

module.exports = { validateObjectId, validateMultipleObjectIds };
