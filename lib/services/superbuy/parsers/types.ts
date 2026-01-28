<<<<<<< HEAD

export interface SuperbuyOrderItem {
    goodsName?: string;
    goodsPic?: string;
    arrivalPicList?: string[];
    picUrl?: string;
    count?: number | string;
    goodsLink?: string;
    unitPrice?: number | string;
    itemRemark?: string;
    weight?: number | string;
    itemBarcode?: string;
    goodsCode?: string;
    itemId?: string | number;
    arrivalPic?: string; // Sometimes JSON string
}

export interface SuperbuyOrder {
    orderItems?: SuperbuyOrderItem[];
    orderNo?: string;
    orderStateName?: string;
    orderStatus?: string;
    totalAmount?: number | string;
}

export interface SuperbuyPackageInfo {
    deliveryName?: string;
    expressNo?: string;
    packageStatusName?: string;
    packageRealWeight?: number | string;
    packagePrice?: number | string;
    realFreight?: number | string;
    freight?: number | string;
    usdToEur?: number | string;
    exchangeRateToEur?: number | string;
    realPackagePrice?: number | string;
    exchangeRate?: number | string;
}

export interface SuperbuyParcel {
    packageNo?: string;
    orderItems?: SuperbuyOrderItem[];
    deliveryEnName?: string;
    packageInfo?: SuperbuyPackageInfo;
    expressNo?: string;
    packageStatusName?: string;
    packageRealWeight?: number | string;
    realPackagePrice?: number | string;
}
=======

export interface SuperbuyOrderItem {
    goodsName?: string;
    goodsPic?: string;
    arrivalPicList?: string[];
    picUrl?: string;
    count?: number | string;
    goodsLink?: string;
    unitPrice?: number | string;
    itemRemark?: string;
    weight?: number | string;
    itemBarcode?: string;
    goodsCode?: string;
    itemId?: string | number;
    arrivalPic?: string; // Sometimes JSON string
}

export interface SuperbuyOrder {
    orderItems?: SuperbuyOrderItem[];
    orderNo?: string;
    orderStateName?: string;
    orderStatus?: string;
    totalAmount?: number | string;
}

export interface SuperbuyPackageInfo {
    deliveryName?: string;
    expressNo?: string;
    packageStatusName?: string;
    packageRealWeight?: number | string;
    packagePrice?: number | string;
    realFreight?: number | string;
    freight?: number | string;
    usdToEur?: number | string;
    exchangeRateToEur?: number | string;
    realPackagePrice?: number | string;
    exchangeRate?: number | string;
}

export interface SuperbuyParcel {
    packageNo?: string;
    orderItems?: SuperbuyOrderItem[];
    deliveryEnName?: string;
    packageInfo?: SuperbuyPackageInfo;
    expressNo?: string;
    packageStatusName?: string;
    packageRealWeight?: number | string;
    realPackagePrice?: number | string;
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
