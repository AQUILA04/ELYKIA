# API Documentation: Credit Distribution Details

This document provides the necessary information for the frontend team to integrate the Credit Distribution Details API.

## Endpoint

- **URL:** `/api/v1/credits/{id}/distribution-details`
- **HTTP Method:** `GET`
- **Description:** Retrieves the details of article distribution for a given parent credit.

## Path Parameters

- `{id}` (required): The ID of the parent credit (`Long`).

## Successful Response (200 OK)

The response will be a standard API response object, with the actual data (a JSON array of credit distribution details) nested within the `data` field.

### Response Body Structure

```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": [
    {
      "creditParentId": "long",
      "parentReference": "string",
      "articleId": "long",
      "articleName": "string",
      "brand": "string",
      "model": "string",
      "parentQuantity": "integer",
      "distributedQuantity": "long",
      "undistributedQuantity": "long"
    }
  ]
}
```

### Field Descriptions

| Field                   | Type    | Description                                                 |
| ----------------------- | ------- | ----------------------------------------------------------- |
| `creditParentId`        | long    | The ID of the parent credit.                                |
| `parentReference`       | string  | The reference of the parent credit.                         |
| `articleId`             | long    | The ID of the article.                                      |
| `articleName`           | string  | The name of the article.                                    |
| `brand`                 | string  | The brand of the article.                                   |
| `model`                 | string  | The model of the article.                                   |
| `parentQuantity`        | integer | The total quantity of the article in the parent credit.     |
| `distributedQuantity`   | long    | The quantity of the article that has been distributed.      |
| `undistributedQuantity` | long    | The quantity of the article that has not yet been distributed.|

### Example JSON Response

```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": [
    {
      "creditParentId": 123,
      "parentReference": "P24123XYZ",
      "articleId": 1,
      "articleName": "Smartphone",
      "brand": "BrandX",
      "model": "ModelY",
      "parentQuantity": 10,
      "distributedQuantity": 7,
      "undistributedQuantity": 3
    },
    {
      "creditParentId": 123,
      "parentReference": "P24123XYZ",
      "articleId": 2,
      "articleName": "Laptop",
      "brand": "BrandA",
      "model": "ModelB",
      "parentQuantity": 5,
      "distributedQuantity": 2,
      "undistributedQuantity": 3
    }
  ]
}

