import { Response, Request, NextFunction } from "express";
import { IProductColorMongo } from "../interfaces/product";
import mongoose from "mongoose";
import { body } from 'express-validator';

export const mapColorFile = (req: Request, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[];
        const colors = JSON.parse(req.body.colors) as IProductColorMongo[];

        colors.forEach((color: IProductColorMongo, index: number) => {
            color._id = new mongoose.Types.ObjectId().toString();
            const mainFile = files.find(f => f.fieldname === `image_main_${index}`);
            if (mainFile) color.image_main = mainFile;

            const colorImagesFiles = files.filter(f => f.fieldname === (`color_images_${index}`));
            color.color_images = colorImagesFiles || [];
        });
        req.body.colors = colors;
        next();
    } catch (err) {
        next(err)
    }
}

export const createProductValidation = [
    body('name')
        .isString().withMessage('Name must be a string')
        .isLength({ min: 10 }).withMessage('Name must be at least 10 characters long')
        .bail(),
    // body('price')
    //     .isNumeric().withMessage('Price must be a number')
    //     .notEmpty().withMessage('Price is required'),
    body('colors')
        .isArray().withMessage('Colors must be an array')
        .notEmpty().withMessage('Colors are required'),
    body('category_id')
        .isString().withMessage('Category ID must be a string')
        .notEmpty().withMessage('Category ID is required'),
    body('brand_id')
        .isString().withMessage('Brand ID must be a string')
        .notEmpty().withMessage('Brand ID is required'),
    body('description')
        .optional()
        .isString().withMessage('Description must be a string')
        .isLength({ min: 20 }).withMessage('Description must be at least 20 characters long'),
    body("attributes")
        .optional()
        .custom(value => {
            if (typeof value !== "object" || Array.isArray(value)) {
                throw new Error("Attributes must be an object");
            }
            for (const [key, val] of Object.entries(value)) {
                if (key.length < 2) {
                    throw new Error(`Attributes key '${key}' must be at least 2 characters long`);
                }
                if (val === null || val === undefined || val === "") {
                    throw new Error(`Attributes '${key}' must have a non-empty value`);
                }
            }
            return true;
        }),
    body("colors")
        .custom(colors => {
            console.log(colors);
            for (const color of colors) {
                if (color.color !== undefined && typeof color.color !== "string") {
                    throw new Error("Color name must be a string");
                } 
                if (!color.image_main || color.image_main === "") {
                    throw new Error("Each color must have a main image");
                }
                if (!Array.isArray(color.color_images) || color.color_images.length === 0) {
                    throw new Error("Each color must have at least one secondary image");
                }
                for (const img of color.color_images) {
                    if (!img) {
                        throw new Error("color_image cannot contain null or empty images");
                    }
                }

            }
            return true;
        })
    
];
