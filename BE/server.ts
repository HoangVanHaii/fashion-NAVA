import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';
import { connectDatabases } from './src/config/database';
import authRouter from './src/routers/user'
import reviewRouter from './src/routers/review'
import adminRouter from './src/routers/admin/user'
import employeeaProduct from './src/routers/employee/product'
import { errorHandler } from './src/middlewares/errorHandler';
import productRouter from './src/routers/product'
import vnpayRouter from './src/routers/vnpay'
import orderRouter from './src/routers/order'
import orderRouterEmployee from './src/routers/employee/order'
import favouriteRouter from './src/routers/favourite'

import categoryRouter from './src/routers/category'
import employeeCatetory from './src/routers/employee/category'
import employeeBrand from './src/routers/employee/brand';
import brandRouter from './src/routers/brand'
import flashSaleRouter from "./src/routers/flashSale";



dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRouter);
// app.use('/api/review', reviewRouter);
app.use('/api/admin', adminRouter);
app.use("/api/product", productRouter);

app.use("/api/order", orderRouter);
app.use("/api/payment", vnpayRouter);
app.use('/api/employee/product', employeeaProduct);
app.use('/api/product', productRouter);
app.use('/api/category', categoryRouter);
app.use('/api/employee/category', employeeCatetory);
app.use('/api/favourite', favouriteRouter);
app.use('/api/brand', brandRouter);
app.use('/api/employee/brand', employeeBrand);
app.use("/api/flashSale", flashSaleRouter);

app.use('/api/employee/order', orderRouterEmployee)
app.use(errorHandler);

app.use((req: Request, res: Response) => {
    return res.status(404).send({ message: "Route not found" });
});

const PORT = process.env.PORT || 3000;

connectDatabases().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
        console.log('Application Ready.');
    });
}).catch(error => {
    console.error('FATAL ERROR: Application could not start due to database connection failure.');
    process.exit(1);
});