# API Documentation Guide

## Overview

This directory contains documentation and examples for the API. We use [Swagger/OpenAPI](https://swagger.io/specification/) for our API documentation, which provides a standard, language-agnostic interface to RESTful APIs.

## How to Document API Endpoints

We use JSDoc-style comments with Swagger annotations to document our API endpoints. This approach allows us to:

1. Keep documentation close to the code
2. Generate interactive API documentation automatically
3. Keep the documentation in sync with the code

### Basic Structure

API documentation is written using JSDoc comments with Swagger annotations:

```typescript
/**
 * @swagger
 * /path/to/endpoint:
 *   method:
 *     summary: Brief description
 *     description: A longer description if needed
 *     tags: [TagName]
 *     parameters:
 *       - name: paramName
 *         in: path/query/header/cookie
 *         description: Parameter description
 *         required: true/false
 *         schema:
 *           type: string/number/integer/boolean/array/object
 *     requestBody:
 *       description: Request body description
 *       required: true/false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResponseSchema'
 */
```

### Defining Data Models

Data models/schemas should be defined using `@swagger` annotations:

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: The user ID
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email
 */
```

### Tags

Group related endpoints under tags for better organization:

```typescript
/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User management
 *   - name: Auth
 *     description: Authentication endpoints
 */
```

## Example

See the [api-examples.ts](./api-examples.ts) file for complete examples of API documentation for various endpoints.

## Viewing the Documentation

Once the server is running, you can access the API documentation at:

```
http://localhost:5001/api-docs
```

This will show an interactive UI where you can:
- Browse all documented endpoints
- See request/response schemas
- Test API calls directly from the browser
- View models and data structures

## Best Practices

1. **Keep it updated**: Update documentation when you change endpoints
2. **Be thorough**: Document all parameters, responses, and error cases
3. **Use schemas**: Define reusable schemas for common data structures
4. **Group logically**: Use tags to group related endpoints
5. **Include examples**: Provide example values where helpful
6. **Document errors**: Include all possible error responses
7. **Use proper HTTP methods**: Follow REST conventions (GET, POST, PUT, DELETE)

## Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger JSDoc](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI Express](https://github.com/scottie1984/swagger-ui-express) 