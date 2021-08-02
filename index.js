const { writeFileSync } = require("fs");
const puppeteer = require("puppeteer");

const config = require("./config.json");
const sites = process.argv.slice(2);

const potentialElements = config.potentialElementsWithNumber;

if (sites.length < 1)
  throw new Error("Please give at least one website along with the arguments!"); 

const main = async () => {
  const browser = await puppeteer.launch();
  const phones = [];

  for (const site of sites) {
    console.log("Scraping:", site);

    const foundData = [];
    const page = await browser.newPage();

    page.on("error", (err) => console.log("Failed scraping", site));
    await page.goto(site);

    await page.evaluate((potentialElements) => {
      for (const p_e of potentialElements) {
        const elements = document.querySelectorAll(`${p_e.element}[${p_e.attr}^='${p_e.attr_value}']`);
        for (let i = 0; i < elements.length; i++)
          if (p_e.clickable)
            elements[i].click();
      }
    }, potentialElements);

    await page.waitForTimeout(2500);
    const content = await page.content();

    const data = content.replace(
      /<script>.+<\/script>/gm,
      ""
    ).replace(
      /<.+?>/gm,
      ""
    );

    // Some conditions for finding phone numbers
    // Split the data line per line

    const lines = data.split("\n")
      .map((i) => i.trim().toLowerCase());

    foundData.push(
      ...lines.filter(
        (line) =>
          (() => {
            const numMatch = line.match(/(\+\d+-\d+)|(\+\d+ \d+)|(\+\d{1,3}\s?)?((\(\d{3}\)\s?)|(\d{3})(\s|-?))(\d{3}(\s|-?))(\d{4})(\s?(([E|e]xt[:|.|]?)|x|X)(\s?\d+))?/g)
              ?.filter((i) => {
                if (line.includes("tel:"))
                  return true;

                try {
                  if (i.startsWith("+") || !isNaN(line))
                    return true;

                  return false;
                } catch(err) {
                  if (i.startsWith("+") || !isNaN(line))
                    return true;

                  return false;
                }
              });

            return Array.isArray(numMatch) && numMatch.length >= 1
          })()
      )
    )

    phones.push({
      site,
      data: foundData 
    });

    await page.close();
  }

  await browser.close();
  return phones;
}

main()
.then((phones) => {
  for (const phone of phones)
    console.log(`Phone numbers found at: ${phone.site}`, phone.data);

  writeFileSync(
    "res.json",
    JSON.stringify(
      { phones },
      null,
      2
    )
  )
})