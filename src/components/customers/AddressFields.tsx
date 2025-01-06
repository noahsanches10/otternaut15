import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface AddressFieldsProps {
  prefix: string;
  disabled?: boolean;
  values: {
    [key: string]: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultState?: string;
  defaultCountry?: string;
}

export function AddressFields({ 
  prefix, 
  disabled = false, 
  values, 
  onChange,
  defaultState = '',
  defaultCountry = ''
}: AddressFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-foreground">
          Street Address
        </Label>
        <Input
          type="text"
          name={`${prefix}_street1`}
          value={values[`${prefix}_street1`]}
          onChange={onChange}
          disabled={disabled}
          className="mt-1.5"
          required
        />
      </div>
      <div>
        <Label className="text-foreground">
          <span>Street Address 2</span>
          <span className="ml-1 text-xs text-muted-foreground">(Optional)</span>
        </Label>
        <Input
          type="text"
          name={`${prefix}_street2`}
          value={values[`${prefix}_street2`]}
          onChange={onChange}
          disabled={disabled}
          className="mt-1.5"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-foreground">
            City
          </Label>
          <Input
            type="text"
            name={`${prefix}_city`}
            value={values[`${prefix}_city`]}
            onChange={onChange}
            disabled={disabled}
            className="mt-1.5"
            required
          />
        </div>
        <div>
          <Label className="text-foreground">
            State/Province
          </Label>
          <Input
            type="text"
            name={`${prefix}_state`}
            value={values[`${prefix}_state`] || defaultState}
            onChange={onChange}
            disabled={disabled}
            className="mt-1.5"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-foreground">
            ZIP Code
          </Label>
          <Input
            type="text"
            name={`${prefix}_zip`}
            value={values[`${prefix}_zip`]}
            onChange={onChange}
            disabled={disabled}
            className="mt-1.5"
            required
          />
        </div>
        <div>
          <Label className="text-foreground">
            Country
          </Label>
          <Input
            type="text"
            name={`${prefix}_country`}
            value={values[`${prefix}_country`] || defaultCountry || "United States"}
            onChange={onChange}
            disabled={disabled}
            className="mt-1.5"
            required
          />
        </div>
      </div>
    </div>
  );
}