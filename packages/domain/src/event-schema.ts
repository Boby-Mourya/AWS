import Ajv2020 from 'ajv/dist/2020.js';
import type { AnySchema, ValidateFunction } from 'ajv';
import type { DomainEvent } from './index.js';

export interface VersionedEventSchema {
  eventType:string;
  version:number;
  schema:AnySchema;
}

function schemaKey(eventType:string,version:number){return `${eventType}@${version}`}

export class EventSchemaRegistry{
  private readonly ajv=new Ajv2020({allErrors:true,strict:false});
  private readonly validators=new Map<string,ValidateFunction>();
  private readonly schemas=new Map<string,AnySchema>();

  register(definition:VersionedEventSchema):void{
    if(!definition.eventType||!Number.isInteger(definition.version)||definition.version<1)throw new Error('INVALID_EVENT_SCHEMA_IDENTITY');
    const key=schemaKey(definition.eventType,definition.version);if(this.validators.has(key))throw new Error(`EVENT_SCHEMA_ALREADY_REGISTERED:${key}`);
    const validator=this.ajv.compile(definition.schema);this.validators.set(key,validator);this.schemas.set(key,definition.schema);
  }

  validate(event:DomainEvent):void{
    const key=schemaKey(event.eventType,event.eventVersion);const validator=this.validators.get(key);if(!validator)throw new Error(`EVENT_SCHEMA_NOT_REGISTERED:${key}`);
    if(!validator(event))throw new Error(`EVENT_SCHEMA_INVALID:${key}:${this.ajv.errorsText(validator.errors)}`);
  }

  get(eventType:string,version:number):AnySchema|undefined{return this.schemas.get(schemaKey(eventType,version))}
}

interface ObjectSchemaShape{type?:unknown;required?:unknown;properties?:unknown;additionalProperties?:unknown}
function objectShape(schema:AnySchema):ObjectSchemaShape{return typeof schema==='boolean'?{}:schema as ObjectSchemaShape}
function typeName(value:unknown):string|undefined{
  if(typeof value==='string')return value;
  if(Array.isArray(value))return [...value].sort().join('|');
  return undefined;
}

/**
 * Conservative backward-compatibility check for JSON event schemas.
 * A new version may add optional fields, but it may not remove old properties,
 * add new required properties, or change the declared type of an existing property.
 */
export function assertBackwardCompatibleEventSchema(previous:AnySchema,next:AnySchema):void{
  const prev=objectShape(previous);const curr=objectShape(next);
  if(prev.type!=='object'||curr.type!=='object')throw new Error('EVENT_SCHEMA_OBJECT_REQUIRED');
  const prevRequired=new Set(Array.isArray(prev.required)?prev.required.filter((v):v is string=>typeof v==='string'):[]);
  const nextRequired=new Set(Array.isArray(curr.required)?curr.required.filter((v):v is string=>typeof v==='string'):[]);
  for(const field of nextRequired)if(!prevRequired.has(field))throw new Error(`EVENT_SCHEMA_NEW_REQUIRED_FIELD:${field}`);
  const prevProperties=(prev.properties&&typeof prev.properties==='object'?prev.properties:{}) as Record<string,AnySchema>;
  const nextProperties=(curr.properties&&typeof curr.properties==='object'?curr.properties:{}) as Record<string,AnySchema>;
  for(const [field,oldSchema] of Object.entries(prevProperties)){
    const newSchema=nextProperties[field];if(!newSchema)throw new Error(`EVENT_SCHEMA_REMOVED_FIELD:${field}`);
    const oldType=typeName(objectShape(oldSchema).type);const newType=typeName(objectShape(newSchema).type);
    if(oldType&&newType&&oldType!==newType)throw new Error(`EVENT_SCHEMA_TYPE_CHANGED:${field}:${oldType}->${newType}`);
  }
}
