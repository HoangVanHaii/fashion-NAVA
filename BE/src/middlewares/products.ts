import { Response, Request, NextFunction } from "express";
import { IProductColorPayload, IProductSizePayload, IUpdateProductColor } from "../interfaces/product";
import mongoose from "mongoose";
import { body, param } from 'express-validator';
import { AppError } from "../utils/appError";

export const mapColorFile = (req: Request, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[];
        if (files.length === 0) {
            throw new AppError("Image is required", 400);
        }
        const colors = JSON.parse(req.body.colors) as IProductColorPayload[];
        colors.forEach((color: IProductColorPayload, index: number) => {
            const mainFile = files.find(f => f.fieldname === `image_main_${index}`);
            if (mainFile) color.image_main = mainFile;

            const colorImagesFiles = files.filter(f => f.fieldname === (`color_images_${index}`));
            color.color_images = colorImagesFiles || [];
        });
        req.body.colors = colors;
        next();
    } catch (err) {
        throw new AppError("Failed to image", 400);
    }
}

export const mapColorFileUpdate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[];
        const color = req.body as any;
        if (color.sizes) {
            if (typeof color.sizes === "string") {
                const match = color.sizes.match(/\[\s*{[\s\S]*}\s*\]/);
                if (match) {
                    color.sizes = JSON.parse(match[0]);
                } else {
                    color.sizes = [];
                }
            }
        } else {
            color.sizes = [];
        }
        const mainFile = files.find(f => f.fieldname === "image_main");
        if (mainFile) {
            color.image_main = mainFile;
        }
        const uploadFiles = files?.filter(f => f.fieldname === "color_images") || [];
        let resultImages: (string | Express.Multer.File)[] = [];
        if (color.color_images) {
            if (Array.isArray(color.color_images)) {
                for (const item of color.color_images) {
                    if (typeof item === "string") {
                        resultImages.push(item);
                    }
                }
            }
        }
        for (const file of uploadFiles) {
            resultImages.push(file);
        }
        color.color_images = resultImages;
        req.body = color;
        next();
    } catch (err) {
        console.log(err);
        throw new AppError("Failed to map images", 400, false);
    }
};

export const createProductValidation = [
    body('name')
        .isString().withMessage('Name must be a string')
        .isLength({ min: 10 }).withMessage('Name must be at least 10 characters long')
        .bail(),
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
            const obj = typeof value === "string" ? JSON.parse(value) : value;
            if (typeof obj !== "object" || Array.isArray(obj)) {
                throw new Error("Attributes must be an object");
            }
            for (const [key, val] of Object.entries(obj)) {
                if (key.length < 2) {
                    throw new Error(`Attributes key '${key}' must be at least 2 characters long`);
                }
                if (val === null || val === undefined || val === "") {
                    throw new Error(`Attributes '${key}' must have a non-empty value`);
                }
            }
            return true;
        }),
        body("colors").custom((colorsRaw) => {
            if (!Array.isArray(colorsRaw)) {
                throw new Error("Colors must be an array");
            }

            const colors = colorsRaw as IProductColorPayload[];
            const errors: string[] = [];

            colors.forEach((color, colorIndex) => {
                if (color.color !== undefined && typeof color.color !== "string") {
                    errors.push(`colors[${colorIndex}].color must be a string`);
                }

                if (!color.image_main || color.image_main === "") {
                    errors.push(`colors[${colorIndex}].image_main is required`);
                }
                if (!Array.isArray(color.color_images) || color.color_images.length === 0) {
                    errors.push(`colors[${colorIndex}].color_images must be an array with at least one image`);
                } else {
                    color.color_images.forEach((img, imgIndex) => {
                        if (!img) errors.push(`colors[${colorIndex}].color_images[${imgIndex}] cannot be null or empty`);
                    });
                }

                if (Array.isArray(color.sizes)) {
                    color.sizes.forEach((size: IProductSizePayload, sizeIndex: number) => {
                        if (size.price === undefined) errors.push(`colors[${colorIndex}].sizes[${sizeIndex}].price is required`);
                        else if (isNaN(Number(size.price))) errors.push(`colors[${colorIndex}].sizes[${sizeIndex}].price must be a number`);

                        if (size.stock === undefined) errors.push(`colors[${colorIndex}].sizes[${sizeIndex}].stock is required`);
                        else if (isNaN(Number(size.stock))) errors.push(`colors[${colorIndex}].sizes[${sizeIndex}].stock must be a number`);

                        if (size.size !== undefined && typeof size.size !== "string") {
                            errors.push(`colors[${colorIndex}].sizes[${sizeIndex}].size must be a string`);
                        }
                    });
                }
            });

            if (errors.length > 0) {
                console.log(errors);
                throw new Error(errors.join("; "));
            }

            return true;
        })
]

export const changeStatusValidation = [
    body("status")
        .isString().withMessage('Status must be a string')
        .notEmpty().withMessage('Status is required')
        .isIn(['hidden', 'active', 'banned']).withMessage('Status must be one of: hidden, active, banned'),
    param("id")
        .isString().withMessage('Product ID SQL must be a string')
        .notEmpty().withMessage('Product ID SQL is required'),
]

export const updateProductInfoValidation = [

    param("id")
        .isString().withMessage("Product ID SQL must be a string")
        .notEmpty().withMessage("Product ID SQL is required"),

    body("name")
        .optional()
        .isString().withMessage("Name must be a string")
        .isLength({ min: 5 }).withMessage("Name must be at least 5 characters"),

    body("description")
        .optional()
        .isString().withMessage("Description must be a string")
        .isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),

    body("brand_id")
        .optional()
        .isString().withMessage("Brand ID must be a string"),

    body("category_id")
        .optional()
        .isString().withMessage("Category ID must be a string"),

    body("attributes")
        .optional()
        .custom(value => {
            const obj = typeof value === "string" ? JSON.parse(value) : value;
            if (typeof obj !== "object" || Array.isArray(obj)) {
                throw new Error("Attributes must be an object");
            }
            return true;
        }),
]
export const updateProductColorValidation = [
    body("product_id_sql")
        .notEmpty()
        .withMessage("Product ID is required"),

    body("color_id_mongo")
        .optional()
        .notEmpty()
        .withMessage("Color ID is required"),

    body("color")
        .optional()
        .isString()
        .withMessage("Color must be a string"),

    body("is_main")
        .isBoolean()
        .withMessage("is_main must be boolean"),

    body("sizes")
        .isArray()
        .withMessage("Sizes must be an array"),

    // body("sizes.*.size_id_mongo")
    //     .notEmpty()
    //     .withMessage("size_id_mongo is required for each size"),

    body("sizes.*.size")
        .isString()
        .withMessage("Size must be a string"),

    body("sizes.*.price")
        .isNumeric()
        .withMessage("Price must be a number"),

    body("sizes.*.stock")
        .isNumeric()
        .withMessage("Stock must be a number"),
]
export const AddProductColorValidation = [
    param("id")
        .notEmpty()
        .withMessage("Product ID is required"),

    body("color")
        .optional()
        .isString()
        .withMessage("Color must be a string"),
    body("sizes")
        .isArray()
        .withMessage("Sizes must be an array"),
    body("sizes.*.size")
        .isString()
        .withMessage("Size must be a string"),

    body("sizes.*.price")
        .isNumeric()
        .withMessage("Price must be a number"),

    body("sizes.*.stock")
        .isNumeric()
        .withMessage("Stock must be a number"),
]
export const getByCategoryValidation = [
    param("category_id")
        .isString().withMessage("Category ID must be a string")
        .notEmpty().withMessage("Category ID is required")
        .isUUID().withMessage("Category ID must be a valid UUID"),
];
export const ProductIdValidation = [
    param("id")
        .isString().withMessage("Id must be a string")
        .notEmpty().withMessage("Id is required")
        .isUUID().withMessage("Id must be a valid UUID"),
];
export const getByBrandValidation = [
    param("brand_id")
        .isString().withMessage("Brand ID must be a string")
        .notEmpty().withMessage("Brand ID is required")
        .isUUID().withMessage("Brand ID must be a valid UUID"),
];

export const deleteColorValidation = [
    body("product_id_sql")
        .isString().withMessage("Id must be a string")
        .notEmpty().withMessage("Id is required")
        .isUUID().withMessage("Id must be a valid UUID"),
    body("color_id_mongo")
        .isString().withMessage("Id must be a string")
        .notEmpty().withMessage("Id is required")    
];
export const statusAllValidation = [
    body("status")
        .isString().withMessage('Status must be a string')
        .notEmpty().withMessage('Status is required')
        .isIn(['hidden', 'active', 'banned']).withMessage('Status must be one of: hidden, active, banned'),   
];
export const stockAllValidation = [
    body("stock")
        .isNumeric()
        .withMessage("Stock must be a number"),
];