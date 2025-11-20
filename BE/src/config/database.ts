import { ConnectionPool, config as mssqlConfig } from 'mssql';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const env = process.env;

const createSqlConfig = (hostKey: string, dbKey: string): mssqlConfig => {
    const prefix = hostKey.substring(0, hostKey.lastIndexOf('_'));
    return {
        server: env[hostKey] as string,
        user: env[`${prefix}_USER`] as string,
        password: env[`${prefix}_PASS`] as string,
        database: env[dbKey] as string,
        options: {
            encrypt: true,
            trustServerCertificate: true,
            enableArithAbort: true
        }
    };
};

const sqlCentralConfig = createSqlConfig('SQL_CENTRAL_HOST', 'SQL_CENTRAL_DB');
const sqlHaNoiConfig = createSqlConfig('SQL_HANOI_HOST', 'SQL_HANOI_DB');
const sqlDaNangConfig = createSqlConfig('SQL_DANANG_HOST', 'SQL_DANANG_DB'); 
const sqlHCMConfig = createSqlConfig('SQL_HCM_HOST', 'SQL_HCM_DB');

export const dbPools = {
    central: new ConnectionPool(sqlCentralConfig),
    bac: new ConnectionPool(sqlHaNoiConfig),
    trung: new ConnectionPool(sqlDaNangConfig),
    nam: new ConnectionPool(sqlHCMConfig),
    status: {
        central: false,
        bac: false,
        trung: false,
        nam: false
    }
};


export const connectDatabases = async (): Promise<void> => {
    console.log('Connecting databases...');
    try {
        await mongoose.connect(env.MONGO_URL!);
        console.log('✅ MongoDB connected.');

        await dbPools.central.connect();
        console.log('✅ SQL Central DB connected.');
        dbPools.status.central = true;

    } catch (err) {
        console.error('❌ FATAL DB CONNECTION ERROR (Mongo or Central):', err);
        process.exit(1);
    }
    //hn
    // try {
    //     await dbPools.bac.connect();
    //     console.log('✅ SQL HaNoi DB (HN) connected.');
    //     dbPools.status.bac = true;
    // } catch (err) {
    //     console.warn('⚠️ SQL HaNoi DB (HN) connection FAILED (App still running):', (err as Error).message);
    // }
    //dn
    try {
        await dbPools.trung.connect();
        console.log('✅ SQL DaNang DB (DN) connected.');
        dbPools.status.trung = true;
    } catch (err) {
        console.warn('⚠️ SQL DaNang DB (DN) connection FAILED (App still running):', (err as Error).message);
    }
    //hcm
    // try {
    //     await dbPools.nam.connect();
    //     console.log('✅ SQL HCM DB (HCM) connected.');
    //     dbPools.status.nam = true;
    // } catch (err) {
    //     console.warn('⚠️ SQL HCM DB (HCM) connection FAILED (App still running):', (err as Error).message);
    // }
};

export const getBranchPool = (branch_code: string): ConnectionPool | null => {
    let pool: ConnectionPool | null = null;
    let poolStatus = false;

    switch (branch_code.toLowerCase()) {
        case 'hn':
            pool = dbPools.bac;
            poolStatus = dbPools.status.bac;
            break;
        case 'dn':
            pool = dbPools.trung;
            poolStatus = dbPools.status.trung;
            break;
        case 'hcm':
            pool = dbPools.nam;
            poolStatus = dbPools.status.nam;
            break;
        default:
            return null;
    }

    if (pool && poolStatus) {
        return pool;
    }
    console.error(`Attempted to get pool for region ${branch_code}, but it is NOT connected.`);
    return null; 
};