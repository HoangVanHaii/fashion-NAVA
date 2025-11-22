import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';
import { connectDatabases } from './src/config/databasel';
import authRouter from './src/routers/user'
import reviewRouter from './src/routers/review'
dotenv.config();

const app = express();

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRouter);
app.use('/api/review', reviewRouter);



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