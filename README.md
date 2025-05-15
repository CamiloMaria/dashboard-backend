<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# Project Documentation

## 1. Introduction

- **Project Name**: Dashboard E-commerce Backend
- **Brief Description**: This project is a backend service for an e-commerce dashboard, providing APIs for product management, order processing, and user authentication.
- **Technologies Used**: NestJS, TypeScript, TypeORM, MySQL, OracleDB, Swagger
- **Important Links**: [Repository](#), [Task Board](#), [External Documentation](#)

## 2. Quick Start Guide

- **Prerequisites**: Node.js, Docker
- **Cloning the Repository**: `git clone <repository-url>`
- **Installing Dependencies**: `npm install`
- **Environment Configuration**: Copy `.env.example` to `.env` and fill in the required values.
- **Running the Project Locally**: `npm run start:dev`
- **Database and Migrations**: Ensure databases are set up and run migrations if necessary.
- **Useful Commands**: `npm run test`, `npm run build`

## 3. Project Structure

- **Main Folders**: `src/`, `test/`, `modules/`, `config/`, `common/`,
- **Naming Conventions**: Follows NestJS and TypeScript standards
- **Core Modules**: Auth, Product, Order, Health

## 4. Main Modules or Components

- **Auth Module**: Handles user authentication and authorization.
- **Product Module**: Manages product data and related operations.
- **Order Module**: Processes and manages orders.
- **Health Module**: Provides system health checks.

## 5. Database

- **Diagram**: [Database Diagram](#)
- **Main Tables**: `web_products`, `web_orders`, `users`
- **Key Relationships**: Products to Orders, Users to Orders
- **Migrations and Seeds**: Managed via TypeORM

## 6. Environments

- **Local**: Development environment with local database
- **Development**: Staging environment for testing
- **Production**: Live environment with production database
- **Differences**: Configuration files and environment variables differ

## 7. Best Practices

- **Code Conventions**: Follow NestJS and TypeScript guidelines
- **Commit Structure**: Use conventional commits
- **Branching Strategy**: Git Flow
- **Tests**: Unit and integration tests using Jest

## 8. Frontend GitHub Repository

- **Dashboard Frontend**: [Dashboard v2](https://github.com/CamiloMaria/dashboard-frontend)
