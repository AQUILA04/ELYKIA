export interface ReturnArticlesDto {
    creditId: number;
    returnArticles: StockEntry[];
}

export interface StockEntry {
    articleId: number;
    quantity: number;
}