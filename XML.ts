/*
  @Author - Lisa Liu-Thorrold

  Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
*/
import * as XMLMapping from 'xml-mapping';


/*
 * This class serves as a semi-replacement XML library for Adobe Flex,
 * with the help of XMLMapping [https://www.npmjs.com/package/xml-mapping].
 */
export class XML {

    // The XML is internally represented as a JSON object
    private xml;

    constructor(xml:string) {
      this.xml = XMLMapping.load(xml);
    }

    // Return attributes of the xml node
    public attributes():XML[] {
      return this.getProperties('attributes', this.xml[Object.keys(this.xml)[0]]);
    }

    // Return elements of the xml node
    public elements():XML[] {
      return this.getProperties('elements', this.xml[Object.keys(this.xml)[0]]);
    }

    // Return the value of the xml element
    public value() {
      var jsonHead = this.xml[Object.keys(this.xml)[0]];
      return jsonHead['$t'];
    }

    // If the name is fully qualified, return the local name
    public localName() {

      var regex = new RegExp(/:(.*)/);

      // Get the full name
      var fullName = Object.keys(this.xml)[0].replace('$', ':');

      // Undo any replacement that the xml-mapping library does to escape colon character
      fullName = fullName.replace('$', ':');

      // Return the first sub-match if it exists
      if (regex.test(fullName)) {
        fullName = regex.exec(fullName)[1];
      }

      return fullName;
    }

    // Get the name of the xml element
    public name() {
      return Object.keys(this.xml)[0];
    }

    // If there is more than one child with the same element
    // name, then it is stored in an array.
    public appendChild(child: string | XML) {

      var childXml;
      var elName;

      if (typeof child === 'string') {
        childXml = new XML(child);
      } else {
        childXml = child;
      }

      elName = childXml.name();

      // No child of this element name exists yet
      if (this.xml[Object.keys(this.xml)[0]][elName] === undefined) {
        this.xml[Object.keys(this.xml)[0]][elName] = childXml.toJsonString()[elName];
      } else {

        // There is at least 2 child elements of this type, push the new one into the array
        if (this.xml[Object.keys(this.xml)[0]][elName] instanceof Array) {
          this.xml[Object.keys(this.xml)[0]][elName].push(childXml.toJsonString()[elName]);
        } else {

          // There is currently 1 child element of this name that exists - convert to array,
          // and add the new element
          var arr = [ this.xml[Object.keys(this.xml)[0]][elName] ];
          arr.push(childXml.toJsonString()[elName]);
          this.xml[Object.keys(this.xml)[0]][elName] = arr;
        }
      }
    }

    /*
      Returns the Adobe Flex's XML toString equivalent
     */
    public toString() {

      // If xml node doesn't contain child elements
      if (this.hasSimpleContent()) {
        // Return the value of the node
        return this.xml[Object.keys(this.xml)[0]].$t;
      }

      // Return the xml string of this xml object
      return this.toXMLString();
    }

    /* Return the xml object as a JSON string */
    public toJsonString() {
        return this.xml;
    }

    /* Return the XML object as an XML string */
    public toXMLString() {
        return XMLMapping.dump(this.xml);
    }

    /* Set an attribute of the current xml element */
    public setAttribute(name: string, value: string) {
        this.xml[Object.keys(this.xml)[0]][name] = value;
    }

    /*
       Checks to see whether the XML object contains simple content.
       An XML object contains simple content if it represents a text node,
       an attribute node, or an XML element that has no child elements.
       XML objects that represent comments and processing instructions
       do not contain simple content. An XML object contains complex content if it has child elements.
    */
    private hasSimpleContent() {
        return this.elements().length == 0;
    }

    /*
       Either a json object, or a string object will be passed to this method
     */
    private isJSON(data) {
      if (typeof data === 'string' || data instanceof String) {
        return false;
      }
      return true;
    }

    /*
      Returns either the attributes or elements of this XML element.
     */
    private getProperties(propertyType, jsonHead, elName?):XML[] {
        var properties = [];

        for (var key in jsonHead) {

          if (key == '$t' && !elName ) {
            continue;
          }

          var xml;

          if (propertyType === 'elements') {

            if (this.isJSON(jsonHead[key])) {

              // There are multiple child elements with the same name - they
              // are represented internally as an array in the JSON structure
              if (Array.isArray(jsonHead[key])) {

                for(var value of jsonHead[key]) {

                  var xmlString = `<${key}></${key}>`
                  var xmlParent = new XML(xmlString);

                  var recurseAdd = this.getProperties(propertyType, value, key);
                  var recurseAtt = this.getProperties('attributes', value, key);

                  for(var childEl of recurseAdd) {
                    xmlParent.appendChild(childEl);
                  }

                  for (var childAtt of recurseAtt) {
                    if (childAtt.value() !== undefined) {
                      xmlParent.setAttribute(childAtt.name(), childAtt.value());
                    }
                  }

                  properties.push(xmlParent);
                }

              } else {
                // Create the JSON representation of the element attribute
                var jsonText = `{ "${key}" : ${JSON.stringify(jsonHead[key])}}`;
                xml = XMLMapping.dump(JSON.parse(jsonText));
                properties.push(new XML(xml));
              }
            }
          }

          if (propertyType === 'attributes') {
            if (!this.isJSON(jsonHead[key])) {
              var escapedKey = key.replace('$', ':');
                xml = `<${escapedKey}>${jsonHead[key]}</${escapedKey}>`;
                properties.push(new XML(xml));
            }
          }

        }

        return properties;
    }
}
