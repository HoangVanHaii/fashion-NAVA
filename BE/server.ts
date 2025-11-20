import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';
import { connectDatabases } from './src/config/databasel'; // Import hàm kết nối CSDL
import productRouter from './src/routers/product'
import { errorHandler } from './src/middlewares/errorHandler';

dotenv.config();

const app = express();

app.use(express.json()); // Cho phép Express đọc JSON body
app.use(express.urlencoded({ extended: true })); // Cho phép Express đọc form data


app.use("/api/product", productRouter);

app.use(errorHandler);

// --- Xử lý lỗi cuối cùng ---
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