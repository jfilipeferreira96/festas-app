import React from "react";
import Input from "./input";

// Test component to demonstrate the different focus styles
export default function InputTest() {
  return (
    <div className="p-8 space-y-4 max-w-md">
      <h2 className="text-lg font-semibold mb-4">Input Focus Styles Test</h2>
      
      {/* Default: Heavy focus (carregado) */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Default Focus (Heavy)
        </label>
        <Input placeholder="This has heavy focus ring" />
      </div>

      {/* Light focus */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Light Focus
        </label>
        <Input 
          placeholder="This has light focus ring" 
          lightFocus 
        />
      </div>

      {/* With error */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Error State
        </label>
        <Input 
          placeholder="Error state" 
          error 
          hint="This is an error message"
        />
      </div>

      {/* With success */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Success State
        </label>
        <Input 
          placeholder="Success state" 
          success 
          hint="This is a success message"
        />
      </div>

      {/* Disabled */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Disabled
        </label>
        <Input 
          placeholder="Disabled input" 
          disabled 
        />
      </div>
    </div>
  );
}
