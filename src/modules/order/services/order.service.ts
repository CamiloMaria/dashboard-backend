import { Injectable } from '@nestjs/common';
import { WebOrder } from '../entities/oracle';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseConnection } from 'src/config';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(WebOrder, DatabaseConnection.ORACLE)
    private readonly webOrderRepository: Repository<WebOrder>,
  ) {}

  async findAll(): Promise<WebOrder[]> {
    return this.webOrderRepository.find();
  }
}
