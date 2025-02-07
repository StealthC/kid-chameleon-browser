# Kid Chameleon Browser

Last build running version at: [Kid Chameleon Browser](https://stealthc.net/kid-chameleon-browser/)

**Analysis and Visualization of Kid Chameleon ROM Resources**

Kid Chameleon Browser is a tool built with TypeScript and Vue.js to identify, extract, and visualize various types of resources (sprites, tile sheets, animations, levels, etc.) from Kid Chameleon ROMs for Sega Genesis/Mega Drive.
None of the proprietary resources from the original game are included in this project source code, just some patterns and reverse-engineering documentation. The user must provide their own ROM file to analyze. 

## Features

- **ROM Loading:**  
  Users can load a ROM directly in the browser to start the analysis.

- **Interactive Visualization:**  
  Displays images of visual resources and a hex dump component to inspect raw resource data.

- **Resource Details:**  
  Each resource is displayed with complete metadata, including base address, type, hash, size, and other details (see [kid-resources.ts](packages/kid-util/src/kid-resources.ts)).

- **Resource Navigation:**  
  Allows navigation between related resources, facilitating the identification and correlation of data extracted from the ROM.

- **Modern Interface:**  
  Utilizes PrimeVue and Tailwind CSS for a responsive and intuitive user experience.

## Project Structure

The workspace structure is based on a monorepo using PNPM and Turbo:

- **apps/**  
  Contains the main Vue.js application (e.g., [kid-browser](apps/kid-browser)). It is responsible for the user interface and resource visualization.

- **packages/**  
  Utility library for manipulating and loading ROM resources. It implements functions for detection and discovery of data related with resources even on modified ROMs, made with compatibility for Node.js and browser environments.

## Requirements

- **Node.js:** Version >= 22  
- **PNPM:** Version >= 9.11.0

## Development

1. **Install dependencies:**

   ```sh
   pnpm install
   ```

2. **Development:**

   Start the development environment with Turbo:

   ```sh
   pnpm dev
   ```

3. **Build:**

   To compile the application:

   ```sh
   pnpm build
   ```

4. **Tests:**

   Run unit and integration tests:

   ```sh
   pnpm test
   ```

## Credits & Licenses

This project is developed by StealthC.
The knowledge and resources used to build this tool were obtained from various sources, including the Kid Chameleon disassembly project and other reverse-engineering efforts.
Thanks to the community for sharing their findings and tools, which were essential for the development of this project.
Kid Chameleon Browser uses various open-source libraries, and the credits for each should be consulted in their respective repositories. Kid Chameleon is a trademark of SEGA Corporation and was developed by SEGA Technical Institute. All rights reserved for the original game and its assets.

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributions

Contributions and suggestions are welcome! Please open an issue or submit a pull request.