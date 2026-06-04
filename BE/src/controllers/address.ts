import { Request, Response, NextFunction } from "express";
import * as addressService from "../services/address";
import { Address_Order } from "../interfaces/address";
import { AppError } from '../utils/appError';

export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);

        const { name, phone, province, district, ward, street_address, is_default } = req.body;

        const newAddress: Address_Order = {
            user_id: Number(req.user.id),
            name,
            phone,
            province,
            district,
            ward,
            street_address,
            is_default
        };

        // Bỏ truyền branch_code
        await addressService.addAddress(newAddress);

        res.status(201).json({ message: "Address added successfully" });
    } catch (error) {
        next(error);
    }
};

export const getAddressesByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);

        // Bỏ truyền branch_code
        const addresses = await addressService.getAddressesByUser(req.user.id);

        res.json({
            success: true,
            message: "Get addresses successfully",
            data: addresses
        });
    } catch (error) {
        next(error);
    }
};

export const getAddressById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);

        const addressId = req.params.id;

        // Bỏ truyền branch_code
        const address = await addressService.getAddressById(Number(req.user.id), Number(addressId));

        if (!address) {
            throw new AppError("Address not found", 404);
        }

        res.json({
            success: true,
            message: "Get address successfully",
            data: address
        });
    } catch (error) {
        next(error);
    }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);

        const user_id = Number(req.user.id);
        const addressId = Number(req.params.id);

        const { name, phone, province, district, ward, street_address, is_default } = req.body;

        const existingAddress = await addressService.getAddressById(user_id, addressId);
        if (!existingAddress) {
            throw new AppError("Address not found", 404);
        }

        const updatedAddress: Address_Order = {
            id: addressId,
            user_id,
            name,
            phone,
            province,
            district,
            ward,
            street_address,
            is_default,
        };

        await addressService.updateAddress(updatedAddress);
        res.status(200).json({ message: "Address updated successfully" });
    } catch (error) {
        next(error);
    }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);

        const user_id = Number(req.user.id);
        const addressId = Number(req.params.id);

        const existingAddress = await addressService.getAddressById(user_id, addressId);
        if (!existingAddress) {
            throw new AppError("Address not found", 404);
        }

        await addressService.deleteAddress(user_id, addressId, existingAddress.is_default);

        res.status(200).json({ message: "Address deleted successfully" });
    } catch (error) {
        next(error);
    }
};