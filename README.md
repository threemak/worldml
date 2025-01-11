# Prototype WorldML markup Language

Welcome to the Prototype Language repository! This project serves as a foundation for creating and experimenting with a new programming language. Whether you're an experienced language designer or just curious about the process, this prototype is designed to be your starting point.

---

## Overview

The Prototype Language is a highly customizable and experimental programming language designed for testing new ideas in syntax, semantics, and language paradigms. It provides:

- A simple core interpreter/compiler to extend.
- Support for rapid prototyping of language features.

---

## Features

- **Customizable Syntax**: Define your own rules for parsing and tokenization.
- **Modular Design**: Easily add or replace components, such as the parser, lexer, or runtime.

---

## Its'a prototype 
### I want to fully extend into this

# WorldML: A Modern Markup Language for the Digital Age

## Core Concepts

WorldML uses a more semantic and intuitive approach with:
- Natural language-like syntax
- Built-in component system
- Native state management
- Automatic accessibility
- Built-in validation
- Reactive data binding

## Basic Syntax

```worldml
@page Home {
  @meta {
    title: "Welcome to WorldML"
    description: "A next-generation markup language"
    author: "John Doe"
  }

  @layout MainLayout {
    @section hero {
      @heading primary "Welcome to the Future"
      @text large "WorldML makes web development intuitive and powerful"
      
      @button primary {
        text: "Get Started"
        action: @navigate("/tutorial")
        animation: "fade-up"
      }
    }

    @container {
      @grid columns=3 gap=20 {
        @card {
          @image src="feature1.jpg" alt="Easy to Learn"
          @heading "Natural Syntax"
          @text "Write markup that reads like natural language"
        }

        @card {
          @image src="feature2.jpg" alt="Built-in Components"
          @heading "Component System"
          @text "Create reusable components with zero setup"
        }

        @card {
          @image src="feature3.jpg" alt="Smart Data"
          @heading "Smart Data Binding"
          @text "Reactive data management built in"
        }
      }
    }
  }
}
```

## Key Features

### 1. Smart Components
```worldml
@component ProductCard {
  @props {
    name: String(required)
    price: Number(required)
    description: String
    inStock: Boolean = true
  }

  @state {
    isInCart: Boolean = false
  }

  @render {
    @card {
      @heading {name}
      @text {description}
      @price format="currency" {price}
      
      @button {
        text: isInCart ? "Remove from Cart" : "Add to Cart"
        action: @toggle(isInCart)
        disabled: !inStock
      }
    }
  }
}
```

### 2. Built-in State Management
```worldml
@store AppState {
  user: {
    name: String
    preferences: Object
  }
  theme: "light" | "dark" = "light"
  cart: Array<Product> = []
}

@component Header {
  @use AppState as state

  @render {
    @nav {
      @text {"Welcome, " + state.user.name}
      @theme-toggle bind={state.theme}
      @cart-icon count={state.cart.length}
    }
  }
}
```

### 3. Automatic Accessibility
```worldml
@form signup {
  @field {
    label: "Email Address"
    type: email
    required: true
    validation: email
    // Automatically adds ARIA labels, error handling
  }

  @field {
    label: "Password"
    type: password
    required: true
    validation: @regex("^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$")
    // Automatically adds password strength indicator
  }
}
```

### 4. Smart Layouts
```worldml
@layout responsive {
  @breakpoints {
    mobile: 0-768px
    tablet: 769px-1024px
    desktop: 1025px+
  }

  @container {
    mobile: stack
    tablet: grid(2)
    desktop: grid(4)
  }
}
```

### 5. Built-in Effects
```worldml
@section hero {
  @parallax speed=0.5 {
    @image src="background.jpg"
  }

  @content {
    @heading {
      @animate type="fade-in" delay=200ms
      "Welcome to WorldML"
    }
  }
}
```

### 6. Data Integration
```worldml
@data Products {
  source: "@api/products"
  cache: 5min
  fallback: "@components/LoadingSkeleton"
}

@list {
  @for product in Products {
    @ProductCard {product}
  }
}
```

### 7. Built-in Validation
```worldml
@type Product {
  id: UUID
  name: String(min=2, max=100)
  price: Number(min=0)
  categories: Array<String>(min=1)
}

@api createProduct {
  method: POST
  validate: Product
  endpoint: "/api/products"
}
```

### 8. Theme System
```worldml
@theme default {
  colors: {
    primary: #3498db
    secondary: #2ecc71
    accent: #e74c3c
  }
  
  typography: {
    heading: "Poppins"
    body: "Inter"
  }
  
  spacing: {
    small: 8px
    medium: 16px
    large: 24px
  }
}
```

## Benefits Over HTML

1. **More Semantic**: Components and attributes use clear, descriptive names that explain their purpose.
2. **Built-in Reactivity**: No need for additional JavaScript frameworks for basic interactivity.
3. **Type Safety**: Built-in validation prevents common errors.
4. **Better Developer Experience**: More intuitive syntax and better error messages.
5. **Performance**: Built-in optimization and caching mechanisms.
6. **Accessibility**: Automatically handles ARIA attributes and keyboard navigation.
7. **Responsive Design**: Built-in responsive layout system.
8. **Component-First**: Native component system without extra tooling.
