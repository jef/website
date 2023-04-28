﻿import { BooleanQueryProperty, StringQueryProperty } from '../decorators';
import { PaginationQuery } from './pagination.dto';

export class AdminCreateUserQuery {
  @StringQueryProperty({
    required: true,
    description: 'The alias to set the new user to'
  })
  readonly alias: string;
}

export class AdminGetReportsQuery extends PaginationQuery {
  @BooleanQueryProperty({
    required: false,
    description: 'Specifies if you want resolved or not'
  })
  readonly resolved: boolean;
}