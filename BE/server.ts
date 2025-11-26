import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';
import { connectDatabases } from './src/config/database';
import authRouter from './src/routers/user'
import reviewRouter from './src/routers/review'
import adminRouter from './src/routers/admin/user'
import { errorHandler } from './src/middlewares/errorHandler';
import productRouter from './src/routers/product'
import cartRouter from './src/routers/cart'
import addressRouter from './src/routers/address'


dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRouter);
app.use('/api/review', reviewRouter);
app.use('/api/admin', adminRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);

app.use(errorHandler);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send({ message: 'Something broke!', error: err.message });
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