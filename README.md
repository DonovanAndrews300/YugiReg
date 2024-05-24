# Yu-Gi-Oh! Konami Registration Form Autofill

This React application helps you fill out Yu-Gi-Oh! Konami registration forms using YDK files. Upload your YDK file, and the app will automatically populate the necessary fields in the registration form.This is a faster way to fill out these forms as card names can be quite long and are often mispelled.

## Features

- **File Upload**: Upload YDK files to autofill the registration form.
- **Form Autofill**: Automatically fills in the form fields based on the uploaded YDK file data.
- **Downloadable PDF**: Allows you to download the filled registration form as a PDF.

## Installation

To get started with this project, follow these steps:

1. Clone the repository:
```
git clone https://github.com/your-username/your-repo-name.git
```

There is a demo ydk file within the client folder of the project that you can use to test out how the application works.

## File Structure

```
├── public
│ ├── index.html
│ └── ...
├── src
│ ├── components
│ │ ├── Faq
│ │ │ └── Faq.tsx
│ │ ├── FileUploader
│ │ │ └── FileUploader.tsx
│ │ └── ...
│ ├── Instructions
│ │ └── Instructions.tsx
│ ├── utils
│ │ └── uploadFile.ts
│ ├── App.tsx
│ ├── index.tsx
│ └── ...
├── .eslint.config.js
├── .gitignore
├── package.json
└── README.md
```
## License

This project is licensed under the MIT License - see the LICENSE file for details.
