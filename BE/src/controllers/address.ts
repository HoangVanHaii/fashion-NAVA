import { Request, Response, NextFunction } from "express";
import * as addressService from "../services/address";
import { Address_Order } from "../interfaces/address";
import { AppError } from '../utils/appError';

export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branch_code = req.user!.branch_code ; 
        const { name, phone, province, district, ward, street_address, is_default } = req.body;
        
        if (!req.user) throw new AppError("Unauthorized", 401);

        const newAddress: Address_Order = {
            user_id: req.user.id, 
            name,
            phone,
            province,
            district,
            ward,
            street_address,
            is_default
        };

        await addressService.addAddress(newAddress, branch_code);

        res.status(201).json({ message: "Address added successfully" });
    } catch (error) {
        next(error);
    }
};

export const getAddressesByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branch_code = req.user?.branch_code || "chinhanh1";
        if (!req.user) throw new AppError("Unauthorized", 401);

        const addresses = await addressService.getAddressesByUser(req.user.id, branch_code);

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
        const branch_code = req.user?.branch_code || "chinhanh1";
        if (!req.user) throw new AppError("Unauthorized", 401);

        // KHÔNG dùng parseInt nữa vì là UUID
        const addressId = req.params.id; 
        
        const address = await addressService.getAddressById(req.user.id, addressId, branch_code);

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
        const branch_code = req.user?.branch_code || "chinhanh1";
        const user_id = req.user!.id;
        const addressId = req.params.id; 

        const { name, phone, province, district, ward, street_address, is_default } = req.body;

        const existingAddress = await addressService.getAddressById(user_id, addressId, branch_code);
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

        await addressService.updateAddress(updatedAddress, branch_code);
        res.status(200).json({ message: "Address updated successfully" });
    } catch (error) {
        next(error);
    }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branch_code = req.user?.branch_code || "chinhanh1";
        const user_id = req.user!.id;
        const addressId = req.params.id;

        const existingAddress = await addressService.getAddressById(user_id, addressId, branch_code);
        if (!existingAddress) {
            throw new AppError("Address not found", 404);
        }

        await addressService.deleteAddress(user_id, addressId, existingAddress.is_default, branch_code);

        res.status(200).json({ message: "Address deleted successfully" });
    } catch (error) {
        next(error);
    }
};