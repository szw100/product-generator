# Travel Product Customer Content Requirements

## 1. Purpose

Use data from an approved canonical product record to complete a given product template including sections: `Settings`,`TRIP HIGHLIGHTS`, `WHAT'S INCLUDED`,  `ITINERARY`, `META INFO` and `MORE INFO`.

Do not generate `AT A GLANCE`. That section is produced by a separate task.

- Find each seciotion by match heading.
- Generation must use only approved canonical data and provided example.
- Use generated content to replace placeholders represented by [] following example format.
- Remove example.


## 2. Settings

### Purpose

Provide concrete details of trip setting based on the approved canonical product record.

### Output

- Heading: `SETTINGS`.
Fill values of all the setting items including:
    1. Maximum Number of People
    2. Minimum Number of People 
    3. What to Carry
    4. Trip Style
    5. Grading
    6. Accommodation Type
    7. Interest




## 3. TRIP HIGHLIGHTS

### Purpose
Summarise the trip highlights.

### Output

- Heading: `TRIP HIGHLIGHTS`.
- Pointed format highlights and selling points; prefer to have even number of points, e.g. 4, 6, 8 points.
- Return an empty list when the approved data has no trip highlights. Generation continues without this section.
- Example:
    * Ride through three distinct Northern Italian regions, showcasing fresh produce, rolling vineyards, and stunning landscapes
    * Discover Italy’s culinary heart with a private chef-led cooking class, tasting incredible wines and learning local secrets
    * Explore captivating UNESCO World Heritage sites, including Sabbioneta, Mantua, and Verona, rich in history and charm
    * Cycle along serene rivers, past Renaissance villages, and near the turquoise shores of Lake Garda
    * Live like royalty at a restored castle-hotel in Parma's countryside and enjoy Relais & Châteaux luxury at a historic villa near Verona
    * Experience the bounty of Italy's Food Valley, with tastings at a Parmigiano-Reggiano cheese farm and renowned Bardolino wineries
    * Bike-in true comfort with two support vans and three tour leaders on each departure for an average 6:1 guest-to-leader ratio
    * Experience the freedom to enjoy the best of this region at your own pace with multiple biking options to choose from each day accommodating varied activities

## 4. WHAT'S INCLUDED

### Purpose

Summarise the inclusions / what's included from the supplier's website about a tour.

### Output

- Heading: `WHAT'S INCLUDED`.
- Pointed format.
- Return an empty list when the approved data has no inclusions. Generation continues without this section.
- Example: 
    * All meals as specified in the itinerary
    * 5 nights accommodation in hotels on a twin share basis
    * All luggage, hotel and shuttle transfers
    * Fully equipped titanium bike, with a helmet and accessories
    * Professional guiding: two support vans, 6:1 guest-to-leader ratio
    * Sightseeing and activities as stated in the itinerary
    * Comprehensive travel planner with detailed pre-trip information
    * Park and other entry fees
    * Expertise and services of our experienced Trip Leaders
    * Snacks and beverages between meals
    * Van shuttles to support a variety of route options
    * All gratuities at hotels and restaurants


## 5. ITINERARY

### Purpose

Summarise the day by day itinerary from the supplier's website about a tour.

### Output

- Heading: `ITINERARY`.
- For walking or biking tour, summarise the walking and biking information in both metric and imperial measurements at the beginning. Bold the tex. Including distance, walking/biking hours, Elevation information. Only write the information if it can be found from supplier's content.
- List accommodation and what meals included by sourcing or analysing from supplier's content.


## 6. META INFO

### Purpose

Provide infomation for SEO.

### Output

- Heading: `META INFO`.
- Including: "Meta Title" and "Meta Description". Generate content for SEO based on the content of the tour.


## 7. MORE INFO

### Purpose

Provide extra infomation about the tour.

### Output

- Heading: `MORE INFO`.
- Subsection "Getting There", based on the content of the tour, write the starting point and finishing point of the tour.  How to get to the starting point. From the concluding point, how to plan for onward travel. Provide logistic recommendations.
- Subsection "Weather & Climate": Source the weather & climate information from the supplier's content and rewrite it. If no content is found, develop new content for the weather & climate information based on the tour's destination.
- Subsection "Biking Level": For biking or walking tours, summarise walking and biking levels for the tour.
- Subsection "Bike Options": For biking tours, source the information about what bikes are provided or included for the tour from the supplier's website. List the upgrade options, but not list the upgrade cost, only mention 'upgrade to xxx is available at an additional cost' 'or 'additional fee' or 'additional charge'. List minimum age requirements.
- Subsection "Other Important Information" : Source and list other important information about the tour from the supplier's website. For example, fitness level requirements, touring vehicle style, terrain information, touring season, culture & custom consideration (i.e wear loose, modest clothing that covers your shoulders and knees at a minimum when travelling in muslim countries, Onsen Etiquette when travelling in Japan), dietary requirements, single occupancy availability, etc




