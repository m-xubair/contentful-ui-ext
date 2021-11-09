
import React from 'react';
require('dotenv').config()
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { Button } from '@contentful/forma-36-react-components';
import { init, locations } from 'contentful-ui-extensions-sdk';
import tokens from '@contentful/forma-36-tokens';
import {createClient} from 'contentful-management';
import '@contentful/forma-36-react-components/dist/styles.css';
import './index.css';


export class DialogExtension extends React.Component {
  static propTypes = {
    sdk: PropTypes.object.isRequired
  };
  render() {
    return (
      <div style={{ margin: tokens.spacingM }}>
        <p style={{ color: '#ff0000'}}>
          This post already exist in the master env!
        </p>
        <Button
          testId="close-dialog"
          buttonType="muted"
          onClick={() => {
            this.props.sdk.close('data from modal dialog');
          }}>
          Close
        </Button>
      </div>
    );
  }
}

let cma = null;

export class SidebarExtension extends React.Component {
  constructor(props) {
    super(props);
    this.sdk = null;
  }
  static propTypes = {
    sdk: PropTypes.object.isRequired
  };
  

  async componentDidMount() {
    const {sdk} = this.props;
    this.sdk = sdk;
    cma = await createClient({
      accessToken: process.env.ACCESS_TOKEN
    });


    sdk.window.startAutoResizer();
    

  }

  checkLinkedEntries = async (fields, spaceMasterEnv) => {
    console.log("Entry:::", this.sdk)

    for(const field in fields) {
      // console.log("Field:::", field);
      for(const local in fields[field]) {
        // console.log("Local::::", local);
        if(Array.isArray(fields[field][local])) {
          fields[field][local].forEach(async (entry) => {
            if(entry.sys.type === 'Link') {
              console.log(`${field} is a linked entry:: `, entry);
              const isEntry = await this.getMasterEntryById(entry.sys.id, spaceMasterEnv);
              if(isEntry === 404) { //Not found
                const extEntry = await this.getExtEnvEntry(entry.sys.id);
                await this.createEntryMasterEnv(entry.sys.id, extEntry, field, spaceMasterEnv);

              }
            }
          })
        } else if(fields[field][local].sys && fields[field][local].sys.type === 'Link') {
          console.log(`${field} is a linked entry::`, fields[field][local])
        }
      }
    }
  }

  
  createEntryMasterEnv = async (id, entry, field, spaceMasterEnv) => {
    try {
      await spaceMasterEnv.createEntryWithId(field, id, entry);
      return true;
    } catch(e) {
      const error = await this.parseError(e);
      return error.status;
    }
  }
  
  getExtEnvEntry = async (id) => {
    try {
      const entry = await this.sdk.space.getEntry(id);
      return entry;
    } catch(e) {
      const error = await this.parseError(e);
      return error.status;
    }
  }

  getMasterEntryById = async (id, spaceMasterEnv) => {
    try {
    const isEntry = await spaceMasterEnv.getEntry(id);
    console.log("Found::::", isEntry);
    } catch(e) {
      const error = await this.parseError(e);
      return error.status;
    }
  }

  parseError = async (e) => {
    let st = JSON.stringify(e);
    const obj = JSON.parse(st, function(key, val){
      return val;
    });
    return JSON.parse(obj.message);
  }



  onButtonClick = async () => {
    const {sdk} = this.props;
    const entryId = sdk.ids.entry;
    const entry = await sdk.space.getEntry(entryId);
    

    if(entry.fields) {
      const space = await cma.getSpace(sdk.ids.space);
      const spaceMasterEnv = await space.getEnvironment('master');
      await this.checkLinkedEntries(entry.fields, spaceMasterEnv);
      try {
        //const newEntry = await spaceMasterEnv.createEntryWithId('posts', entry.sys.id, entry);
        // console.log('Entry::::', newEntry);
        console.log("Create new entry")

      } catch(error) {
        // await this.props.sdk.dialogs.openExtension({
        //   width: 400,
        //   title: 'Error!',
          
        // });
      }
    }
  };

  render() {
    return (
      <Button
        buttonType="positive"
        isFullWidth={true}
        testId="open-dialog"
        onClick={this.onButtonClick}>
        Move Post to Master ENV
      </Button>
    );
  }
}

export const initialize = sdk => {
  if (sdk.location.is(locations.LOCATION_DIALOG)) {
    ReactDOM.render(<DialogExtension sdk={sdk} />, document.getElementById('root'));
  } else {
    ReactDOM.render(<SidebarExtension sdk={sdk} />, document.getElementById('root'));
  }
};

init(initialize);

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
// if (module.hot) {
//   module.hot.accept();
// }
